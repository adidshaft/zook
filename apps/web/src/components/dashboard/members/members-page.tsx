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
  const [subscriptionStatusTone, setSubscriptionStatusTone] = useState<
    "neutral" | "success" | "danger"
  >("neutral");
  const [switchPlanId, setSwitchPlanId] = useState("");
  const [pauseResumesAt, setPauseResumesAt] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [pauseReason, setPauseReason] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>(() =>
    statusFromParam(searchParams.get("status")),
  );
  const [memberSearch, setMemberSearch] = useState(() => searchParams.get("search") ?? "");
  const [selectedBulkMemberIds, setSelectedBulkMemberIds] = useState<string[]>([]);
  const [memberAccessBusyId, setMemberAccessBusyId] = useState<string | null>(null);
  const [memberAccessStatus, setMemberAccessStatus] = useState("");
  const [memberAccessStatusTone, setMemberAccessStatusTone] = useState<"neutral" | "lime" | "red">(
    "neutral",
  );
  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;
  const selectedBulkMembers = members.filter((member) =>
    selectedBulkMemberIds.includes(member.user?.id ?? ""),
  );
  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const status = normalizeMemberText(member.activeSubscription?.status);
        const endsAt = member.activeSubscription?.endsAt;
        const daysUntilEnd = endsAt
          ? Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        const planName = normalizeMemberText(member.activeSubscription?.plan?.name);
        const planType = normalizeMemberText(member.activeSubscription?.plan?.type);
        const statusAndPlan = `${status} ${planName} ${planType}`;
        const missingContact = !member.user?.email && !member.user?.phone;
        const filterMatch =
          memberFilter === "All" ||
          (memberFilter === "Active" && status.includes("active")) ||
          (memberFilter === "Expiring Soon" &&
            daysUntilEnd !== null &&
            daysUntilEnd >= 0 &&
            daysUntilEnd <= 7) ||
          (memberFilter === "Missing Contact" && missingContact) ||
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
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updateMemberAccess(memberUserId: string, status: "active" | "inactive") {
    setMemberAccessBusyId(memberUserId);
    setMemberAccessStatus("");
    setMemberAccessStatusTone("neutral");
    try {
      await webApiFetch(`/api/orgs/${orgId}/members/${memberUserId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
        feedback: {
          success: status === "active" ? "Member reactivated." : "Member deactivated.",
          error: "Unable to update member access.",
        },
      });
      membersState.reload();
      if (selectedMemberId === memberUserId) {
        memberDetailState.reload();
      }
      setMemberAccessStatusTone("lime");
      setMemberAccessStatus(
        status === "active" ? "Member can access the gym again." : "Member access is inactive.",
      );
    } catch (error) {
      setMemberAccessStatusTone("red");
      setMemberAccessStatus(
        error instanceof Error ? error.message : "Unable to update member access.",
      );
    } finally {
      setMemberAccessBusyId(null);
    }
  }

  async function bulkArchiveMembers() {
    const selectedIds = [...selectedBulkMemberIds];
    if (!selectedIds.length) return;
    setMemberAccessBusyId("bulk");
    setMemberAccessStatus("");
    setMemberAccessStatusTone("neutral");
    try {
      await Promise.all(
        selectedIds.map((memberUserId) =>
          webApiFetch(`/api/orgs/${orgId}/members/${memberUserId}/status`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "inactive" }),
            feedback: { success: false, error: "Unable to archive selected members." },
          }),
        ),
      );
      setSelectedBulkMemberIds([]);
      membersState.reload();
      if (selectedMemberId && selectedIds.includes(selectedMemberId)) {
        memberDetailState.reload();
      }
      setMemberAccessStatusTone("lime");
      setMemberAccessStatus(
        `${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"} archived.`,
      );
    } catch (error) {
      setMemberAccessStatusTone("red");
      setMemberAccessStatus(error instanceof Error ? error.message : "Unable to archive members.");
    } finally {
      setMemberAccessBusyId(null);
    }
  }

  async function updateSubscription(action: "switch" | "pause" | "resume") {
    if (!selectedSubscription) return;
    const pauseDateIso = pauseResumesAt
      ? new Date(`${pauseResumesAt}T00:00:00.000Z`).toISOString()
      : "";
    if (action === "pause" && !pauseDateIso) {
      setSubscriptionStatusTone("danger");
      setSubscriptionStatus("Choose a resume date before pausing.");
      return;
    }
    setSubscriptionBusy(action);
    setSubscriptionStatus("");
    setSubscriptionStatusTone("neutral");
    try {
      await webApiFetch(`/api/orgs/${orgId}/subscriptions/${selectedSubscription.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(action === "switch" ? { planId: switchPlanId } : {}),
          ...(action === "pause"
            ? {
                resumesAt: pauseDateIso,
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
      setSubscriptionStatusTone("success");
      setSubscriptionStatus(
        action === "switch"
          ? "Membership switched to the new plan."
          : action === "pause"
            ? `Membership paused until ${pauseResumesAt}.`
            : "Membership resumed.",
      );
    } catch (error) {
      setSubscriptionStatusTone("danger");
      setSubscriptionStatus(
        error instanceof Error ? error.message : "Unable to update membership.",
      );
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
      {view !== "join-requests" ? (
        <MemberSummary members={members} joinRequests={joinRequests} />
      ) : null}

      {view === "join-requests" ? (
        joinRequestsPanel
      ) : (
        <>
          <div className={`grid gap-4 ${joinRequests.length > 0 ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
            <div className="grid gap-4">
              <MemberList
                orgId={orgId}
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
                bulkArchiveMembers={bulkArchiveMembers}
                clearSelection={() => setSelectedBulkMemberIds([])}
                setSelectedMemberId={setSelectedMemberId}
                memberAccessBusyId={memberAccessBusyId}
                memberAccessStatus={memberAccessStatus}
                memberAccessStatusTone={memberAccessStatusTone}
                updateMemberAccess={updateMemberAccess}
              />
              <MemberDetailDrawer
                selectedMemberId={selectedMemberId}
                memberDetailState={memberDetailState}
                membershipPlans={membershipPlans}
                switchPlanId={switchPlanId}
                setSwitchPlanId={setSwitchPlanId}
                pauseResumesAt={pauseResumesAt}
                setPauseResumesAt={setPauseResumesAt}
                pauseReason={pauseReason}
                setPauseReason={setPauseReason}
                subscriptionBusy={subscriptionBusy}
                subscriptionStatus={subscriptionStatus}
                subscriptionStatusTone={subscriptionStatusTone}
                setSelectedMemberId={setSelectedMemberId}
                updateSubscription={updateSubscription}
              />
            </div>
            {joinRequests.length > 0 ? joinRequestsPanel : null}
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
