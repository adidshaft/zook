"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MemberDetailDrawer } from "./member-detail-drawer";
import { MemberSummary } from "./member-summary";
import { BulkImportCard } from "./bulk-import-card";
import { JoinRequestQueue } from "./join-requests-page";
import { MemberList } from "./member-list";
import { MembershipPlanLadder } from "./membership-plan-ladder";
import { webApiFetch } from "@/lib/api-client";
import type { MemberFilter, MembersPageProps } from "./member-list/types";
import { memberFilters, normalizeMemberText } from "./member-list/types";

function statusFromParam(value: string | null): MemberFilter {
  return memberFilters.find((filter) => filter.toLowerCase() === value?.toLowerCase()) ?? "All";
}

export function MembersPage({
  view = "members",
  orgId,
  organization,
  members,
  membersState,
  selectedMemberId,
  setSelectedMemberId,
  memberDetailState,
  joinRequests,
  joinRequestsState,
  queueError,
  queueBusyId,
  updateJoinRequest,
  membershipPlans,
  membershipPlansState,
  planNamesById,
}: MembersPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [subscriptionBusy, setSubscriptionBusy] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [switchPlanId, setSwitchPlanId] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>(() =>
    statusFromParam(searchParams.get("status")),
  );
  const [memberSearch, setMemberSearch] = useState(() => searchParams.get("search") ?? "");
  const [selectedBulkMemberIds, setSelectedBulkMemberIds] = useState<string[]>([]);
  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;
  const selectedBulkMembers = members.filter((member) =>
    selectedBulkMemberIds.includes(member.user?.id ?? ""),
  );
  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const status = normalizeMemberText(member.activeSubscription?.status);
        const planName = normalizeMemberText(member.activeSubscription?.plan?.name);
        const planType = normalizeMemberText(member.activeSubscription?.plan?.type);
        const statusAndPlan = `${status} ${planName} ${planType}`;
        const filterMatch =
          memberFilter === "All" ||
          (memberFilter === "Active" && status.includes("active")) ||
          (memberFilter === "Expired" && status.includes("expired")) ||
          (memberFilter === "Paused" && status.includes("paused")) ||
          (memberFilter === "Pending Payment" &&
            /(pending|payment|past due|past_due|unpaid|due)/.test(statusAndPlan)) ||
          (memberFilter === "Visit Pack" && /(visit|pack)/.test(statusAndPlan)) ||
          (memberFilter === "Trial" && /trial/.test(statusAndPlan));
        const search = normalizeMemberText(memberSearch);
        const searchText = [
          member.user?.name,
          member.user?.email,
          member.user?.phone,
          member.user?.id,
          member.profile.id,
          member.user?.fitnessGoal,
          member.activeSubscription?.status,
          planName,
          planType,
        ]
          .map(normalizeMemberText)
          .join(" ");
        return filterMatch && (!search || searchText.includes(search));
      }),
    [memberFilter, memberSearch, members],
  );
  const filtersActive = memberFilter !== "All" || memberSearch.trim().length > 0;

  useEffect(() => {
    if (view !== "members") {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const search = memberSearch.trim();
      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }
      if (memberFilter === "All") {
        params.delete("status");
      } else {
        params.set("status", memberFilter);
      }
      const nextQuery = params.toString();
      if (nextQuery !== searchParams.toString()) {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [memberFilter, memberSearch, pathname, router, searchParams, view]);

  function toggleBulkMember(userId: string | undefined) {
    if (!userId) return;
    setSelectedBulkMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function exportSelectedMembers() {
    const rows = selectedBulkMembers.map((member) => [
      member.user?.name ?? "Member",
      member.user?.email ?? "",
      member.user?.phone ?? "",
      member.activeSubscription?.status ?? "",
    ]);
    const csv = [
      ["Name", "Email", "Phone", "Subscription"].join(","),
      ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updateSubscription(action: "switch" | "pause" | "resume") {
    if (!selectedSubscription) return;
    const confirmed = window.confirm(
      action === "switch"
        ? "Switch this member to the selected plan now?"
        : action === "pause"
          ? "Pause this membership for 7 days now?"
          : "Resume this paused membership now?",
    );
    if (!confirmed) {
      return;
    }
    setSubscriptionBusy(action);
    setSubscriptionStatus("");
    try {
      await webApiFetch(`/api/orgs/${orgId}/subscriptions/${selectedSubscription.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(action === "switch" ? { planId: switchPlanId } : {}),
          ...(action === "pause"
            ? {
                resumesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                reason: pauseReason || undefined,
              }
            : {}),
        }),
        feedback: {
          success:
            action === "switch"
              ? "Membership plan switched."
              : action === "pause"
                ? "Membership paused."
                : "Membership resumed.",
          error: "Unable to update membership.",
        },
      });
      memberDetailState.reload();
      membersState.reload();
      setSubscriptionStatus("Membership updated.");
    } catch (error) {
      setSubscriptionStatus(error instanceof Error ? error.message : "Unable to update membership.");
    } finally {
      setSubscriptionBusy(null);
    }
  }

  const joinRequestsPanel = (
    <JoinRequestQueue
      joinRequests={joinRequests}
      joinRequestsState={joinRequestsState}
      queueError={queueError}
      queueBusyId={queueBusyId}
      planNamesById={planNamesById}
      updateJoinRequest={updateJoinRequest}
    />
  );

  return (
    <div className="grid gap-4">
      <MemberSummary members={members} joinRequests={joinRequests} />

      {view === "join-requests" ? (
        joinRequestsPanel
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4">
              <MemberList
                orgId={orgId}
                organization={organization}
                members={members}
                filteredMembers={filteredMembers}
                membersState={membersState}
                filtersActive={filtersActive}
                memberFilter={memberFilter}
                setMemberFilter={setMemberFilter}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                selectedBulkMemberIds={selectedBulkMemberIds}
                toggleBulkMember={toggleBulkMember}
                exportSelectedMembers={exportSelectedMembers}
                clearSelection={() => setSelectedBulkMemberIds([])}
                setSelectedMemberId={setSelectedMemberId}
              />
              <MemberDetailDrawer
                selectedMemberId={selectedMemberId}
                memberDetailState={memberDetailState}
                membershipPlans={membershipPlans}
                switchPlanId={switchPlanId}
                setSwitchPlanId={setSwitchPlanId}
                pauseReason={pauseReason}
                setPauseReason={setPauseReason}
                subscriptionBusy={subscriptionBusy}
                subscriptionStatus={subscriptionStatus}
                setSelectedMemberId={setSelectedMemberId}
                updateSubscription={(action) => void updateSubscription(action)}
              />
            </div>
            {joinRequestsPanel}
          </div>

          <MembershipPlanLadder
            membershipPlans={membershipPlans}
            membershipPlansState={membershipPlansState}
          />

          <BulkImportCard
            orgId={orgId}
            membershipPlans={membershipPlans}
            onImportComplete={() => {
              membersState.reload();
            }}
          />
        </>
      )}
    </div>
  );
}
