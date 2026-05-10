"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BodyCompositionTimeline } from "../body-composition-timeline";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn, SearchableSelect } from "../../ui";
import {
  formatPlanShape,
  type JoinRequestRow,
  type MemberDetailPayload,
  type MemberRow,
  type MembershipPlanRow,
  type OrganizationSnapshot,
} from "../../dashboard-operational-model";
import { formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";

type MemberFilter = "All" | "Active" | "Pending Payment" | "Expired" | "Paused" | "Visit Pack" | "Trial";

const memberFilters: MemberFilter[] = [
  "All",
  "Active",
  "Pending Payment",
  "Expired",
  "Paused",
  "Visit Pack",
  "Trial",
];

function normalizeMemberText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

type MembersState = {
  error: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
};

type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

export function MembersSection({
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
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  members: MemberRow[];
  membersState: MembersState;
  selectedMemberId: string | null;
  setSelectedMemberId: (memberId: string | null) => void;
  memberDetailState: ResourceState<MemberDetailPayload>;
  joinRequests: JoinRequestRow[];
  joinRequestsState: ResourceState<{ joinRequests: JoinRequestRow[] }>;
  queueError: string;
  queueBusyId: string | null;
  updateJoinRequest: (requestId: string, action: "approve" | "reject") => Promise<void>;
  membershipPlans: MembershipPlanRow[];
  membershipPlansState: ResourceState<{ plans: MembershipPlanRow[] }>;
  planNamesById: Map<string, string>;
}) {
  const [subscriptionBusy, setSubscriptionBusy] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [switchPlanId, setSwitchPlanId] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("All");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedBulkMemberIds, setSelectedBulkMemberIds] = useState<string[]>([]);
  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;
  const selectedBulkMembers = members.filter((member) =>
    selectedBulkMemberIds.includes(member.user?.id ?? ""),
  );
  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const status = normalizeMemberText(member.activeSubscription?.status);
        const planName = "";
        const statusAndPlan = `${status} ${planName}`;
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
        ]
          .map(normalizeMemberText)
          .join(" ");

        return filterMatch && (!search || searchText.includes(search));
      }),
    [memberFilter, memberSearch, members],
  );
  const filtersActive = memberFilter !== "All" || memberSearch.trim().length > 0;

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
      setSubscriptionStatus(
        error instanceof Error ? error.message : "Unable to update membership.",
      );
    } finally {
      setSubscriptionBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="xl:col-span-1">
          <SectionHeader
            eyebrow="Members"
            title="Member roster"
            description="Profiles come from the member directory."
            badge={
              <Pill tone="lime">
                {filtersActive ? `${filteredMembers.length}/${members.length}` : members.length} profiles
              </Pill>
            }
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/members.csv`} />}
          />
          {selectedMemberId ? (
            <div className="mt-4 rounded-[22px] border border-lime-200/15 bg-lime-200/8 p-4">
              {memberDetailState.error ? (
                <ErrorNotice message={memberDetailState.error} />
              ) : memberDetailState.loading || !memberDetailState.data ? (
                <div className="grid gap-3 lg:grid-cols-4" aria-label="Member detail is refreshing">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-20 rounded-[18px] border border-white/10 bg-white/6"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Member</p>
                    <p className="mt-2 font-medium text-white">
                      {memberDetailState.data.member.user?.name ?? "Member"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {memberDetailState.data.member.user?.email ?? "No email"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Subscription
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      {memberDetailState.data.member.subscriptions[0]?.plan?.name ?? "No plan"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {memberDetailState.data.member.subscriptions[0]
                        ? formatEnumLabel(memberDetailState.data.member.subscriptions[0].status)
                        : "No subscription"}
                    </p>
                    {selectedSubscription ? (
                      <div className="mt-3 grid gap-2">
                        <SearchableSelect
                          label="Switch membership plan"
                          placeholder="Choose plan"
                          searchPlaceholder="Search plans"
                          value={switchPlanId}
                          onChange={setSwitchPlanId}
                          options={membershipPlans
                            .filter((plan) => plan.active)
                            .map((plan) => ({
                              value: plan.id,
                              label: plan.name,
                              description: formatInr(plan.pricePaise),
                            }))}
                        />
                        <textarea
                          value={pauseReason}
                          onChange={(event) => setPauseReason(event.target.value)}
                          maxLength={180}
                          placeholder="Pause reason"
                          className="zook-focus min-h-16 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35"
                        />
                        <p className="text-[11px] text-white/40">{pauseReason.length}/180</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!switchPlanId || Boolean(subscriptionBusy)}
                            onClick={() => void updateSubscription("switch")}
                            className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                          >
                            Switch
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(subscriptionBusy) || selectedSubscription.status !== "ACTIVE"}
                            onClick={() => void updateSubscription("pause")}
                            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 disabled:opacity-50"
                          >
                            Pause 7d
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(subscriptionBusy) || selectedSubscription.status !== "PAUSED"}
                            onClick={() => void updateSubscription("resume")}
                            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 disabled:opacity-50"
                          >
                            Resume
                          </button>
                        </div>
                        {subscriptionStatus ? (
                          <p className="text-xs text-white/50">{subscriptionStatus}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Activity</p>
                    <p className="mt-2 text-sm text-white/70">
                      {memberDetailState.data.member.attendance.length} recent check-ins
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {memberDetailState.data.member.workouts.length} trainer-visible workouts
                    </p>
                    <ManagedOn surface="member-mobile" className="mt-3">
                      Members log workouts, body, and habits in the mobile app.
                    </ManagedOn>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Payments</p>
                    <p className="mt-2 text-sm text-white/70">
                      {memberDetailState.data.member.payments.length} recent records
                    </p>
                    <button
                      onClick={() => setSelectedMemberId(null)}
                      className="zook-focus mt-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
                    >
                      Close
                    </button>
                  </div>
                  <BodyCompositionTimeline
                    entries={memberDetailState.data.member.bodyProgress ?? []}
                  />
                </div>
              )}
            </div>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {memberFilters.map((filter) => {
                const active = filter === memberFilter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setMemberFilter(filter)}
                    className="zook-focus rounded-full"
                    aria-pressed={active}
                  >
                    <Pill
                      tone={
                        active
                          ? "lime"
                          : filter === "Pending Payment"
                            ? "amber"
                            : "neutral"
                      }
                      className={active ? "border-lime-300/45 bg-lime-300/10" : "hover:bg-white/12"}
                    >
                      {filter}
                    </Pill>
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search name, email, phone, member ID"
              className="zook-focus min-h-11 min-w-0 rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/38 lg:w-[360px]"
            />
          </div>
          <div className="mt-5">
            {membersState.error ? (
              <ErrorNotice message={membersState.error} />
            ) : membersState.loading && members.length === 0 ? (
              <EmptyState
                title="Loading member roster"
                description="Pulling the latest organization member list."
              />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      id: "select",
                      header: "Select",
                      render: (row) => (
                        <input
                          type="checkbox"
                          checked={Boolean(row.user?.id && selectedBulkMemberIds.includes(row.user.id))}
                          onChange={() => toggleBulkMember(row.user?.id)}
                          aria-label={`Select ${row.user?.name ?? "member"}`}
                          className="zook-focus h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
                        />
                      ),
                    },
                    {
                      id: "member",
                      header: "Member",
                      render: (row) => (
                        <div>
                          <p className="font-medium text-white">
                            {row.user?.name ?? "Member profile"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.user?.email ?? "No email recorded"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "contact",
                      header: "Contact",
                      render: (row) => (
                        <div>
                          <p>
                            {row.user?.phone ??
                              organization.contactPhone ??
                              "Desk follow-up needed"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.user?.fitnessGoal ?? "Goal capture pending"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "profile",
                      header: "Profile state",
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          <StatusPill
                            value={row.profile.publicVisibility ? "Visible" : "Private"}
                            tone={row.profile.publicVisibility ? "blue" : "neutral"}
                          />
                          <StatusPill
                            value={row.profile.marketingOptIn ? "Marketing on" : "Marketing off"}
                            tone={row.profile.marketingOptIn ? "lime" : "amber"}
                          />
                        </div>
                      ),
                    },
                    {
                      id: "joined",
                      header: "Created",
                      render: (row) => formatDate(row.profile.createdAt),
                    },
                    {
                      id: "detail",
                      header: "Detail",
                      align: "right",
                      render: (row) => (
                        <button
                          onClick={() => row.user?.id && setSelectedMemberId(row.user.id)}
                          disabled={!row.user?.id}
                          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 hover:bg-white/8 disabled:opacity-40"
                        >
                          View
                        </button>
                      ),
                    },
                  ]}
                  rows={filteredMembers}
                  rowKey={(row) => row.profile.id}
                  empty={
                    <EmptyState
                      title={filtersActive ? "No loaded members match" : "No members yet"}
                      description={
                        filtersActive
                          ? "Try a different filter or search term. This filters the currently loaded roster."
                          : "Create your first membership plan and share your join link to start accepting members."
                      }
                      action={
                        filtersActive ? null : (
                          <Link
                            href="/dashboard/plans"
                            className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                          >
                            Create a plan
                          </Link>
                        )
                      }
                    />
                  }
                />
                {selectedBulkMemberIds.length ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-lime-200/15 bg-lime-200/8 px-4 py-3">
                    <p className="text-sm text-white/70">
                      {selectedBulkMemberIds.length} selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportSelectedMembers}
                        className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                      >
                        Export selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBulkMemberIds([])}
                        className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
                <LoadMoreButton
                  count={members.length}
                  hasMore={membersState.hasMore}
                  loading={membersState.loadingMore}
                  onLoadMore={membersState.loadMore}
                />
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Pipeline"
            title="Join request queue"
            description="Approval-required requests appear here so owners can approve or reject memberships before payment."
            badge={
              <Pill tone={joinRequests.length ? "amber" : "lime"}>
                {joinRequests.length} pending
              </Pill>
            }
          />
          {queueError ? (
            <div className="mt-5">
              <ErrorNotice message={queueError} />
            </div>
          ) : null}
          <div className="mt-5 grid gap-3">
            {joinRequestsState.error ? (
              <ErrorNotice message={joinRequestsState.error} />
            ) : joinRequests.length ? (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">
                          {planNamesById.get(request.planId ?? "") ?? "Membership request"}
                        </p>
                        <StatusPill value={formatEnumLabel(request.status)} />
                      </div>
                      <p className="mt-2 text-xs text-white/45">
                        Created {formatDateTime(request.createdAt)}
                        {request.referralCode ? ` · Referral ${request.referralCode}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        {request.message ?? "No intake note. Consider WhatsApp-ing the member before approving."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void updateJoinRequest(request.id, "approve")}
                        disabled={queueBusyId === request.id}
                        className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void updateJoinRequest(request.id, "reject")}
                        disabled={queueBusyId === request.id}
                        className="zook-focus rounded-full border border-red-300/30 bg-red-300/10 px-4 py-2 text-sm text-red-100 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Queue is clear"
                description="Open-join or already-reviewed memberships will not stack up here."
              />
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionHeader
          eyebrow="Membership setup"
          title="Membership plan ladder"
          description="Use the live pricing ladder below to see which plans are public, how they are shaped, and which ones are currently active."
          badge={<Pill tone="blue">{membershipPlans.length} plans</Pill>}
        />
        <div className="mt-5">
          {membershipPlansState.error ? (
            <ErrorNotice message={membershipPlansState.error} />
          ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
            <EmptyState
              title="Loading plan ladder"
              description="Pulling the latest membership plans for this organization."
            />
          ) : (
            <DataTable
              columns={[
                {
                  id: "plan",
                  header: "Plan",
                  render: (plan) => (
                    <div>
                      <p className="font-medium text-white">{plan.name}</p>
                      <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                    </div>
                  ),
                },
                {
                  id: "shape",
                  header: "Shape",
                  render: (plan) => formatPlanShape(plan),
                },
                {
                  id: "price",
                  header: "Price",
                  align: "right",
                  render: (plan) => (
                    <span className="font-medium text-white">{formatInr(plan.pricePaise)}</span>
                  ),
                },
                {
                  id: "state",
                  header: "State",
                  render: (plan) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        value={plan.active ? "Active" : "Paused"}
                        tone={plan.active ? "lime" : "amber"}
                      />
                      <StatusPill
                        value={plan.publicVisible ? "Public" : "Private"}
                        tone={plan.publicVisible ? "blue" : "neutral"}
                      />
                    </div>
                  ),
                },
              ]}
              rows={membershipPlans}
              rowKey={(plan) => plan.id}
              empty="No membership plans are available yet."
            />
          )}
        </div>
      </GlassCard>

      <BulkImportCard
        orgId={orgId}
        membershipPlans={membershipPlans}
        onImportComplete={() => {
          membersState.reload();
        }}
      />
    </div>
  );
}

function BulkImportCard({
  orgId,
  membershipPlans,
  onImportComplete,
}: {
  orgId: string;
  membershipPlans: MembershipPlanRow[];
  onImportComplete: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [planId, setPlanId] = useState("");
  const [activateSub, setActivateSub] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; created: number; existing: number; errors: number };
    results: Array<{ row: number; status: string; email?: string; error?: string }>;
  } | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
        setImportResult(null);
      }
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!csvText.trim()) return;
    setBusy(true);
    setImportResult(null);
    try {
      const result = await webApiFetch<{
        summary: { total: number; created: number; existing: number; errors: number };
        results: Array<{ row: number; status: string; email?: string; error?: string }>;
      }>(`/api/orgs/${orgId}/members/import`, {
        method: "POST",
        body: {
          csv: csvText,
          ...(planId ? { planId } : {}),
          activateSubscription: activateSub,
          sendWelcomeNotification: sendNotification,
        },
        feedback: {
          success: "Import completed.",
          error: "Import failed. Check the CSV format and try again.",
        },
      });
      setImportResult(result);
      onImportComplete();
    } catch {
      // Toast handled by webApiFetch
    } finally {
      setBusy(false);
    }
  }

  const errorRows = importResult?.results.filter((r) => r.status === "error") ?? [];

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Onboarding"
        title="Bulk member import"
        description="Upload a CSV file with member details to add them all at once. CSV must include 'name' and 'email' columns. Optional: 'phone'."
        badge={<Pill tone="blue">CSV</Pill>}
      />
      <div className="mt-5 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="zook-focus flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-lime-300"
            >
              <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {csvText ? (
            <span className="text-xs text-lime-300/80">
              {csvText.split(/\r?\n/).filter(Boolean).length - 1} data rows loaded
            </span>
          ) : null}
        </div>

        {csvText ? (
          <textarea
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setImportResult(null);
            }}
            rows={5}
            placeholder="name,email,phone&#10;Rahul Sharma,rahul@example.com,9876543210"
            className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-white/80 placeholder:text-white/25"
          />
        ) : (
          <textarea
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setImportResult(null);
            }}
            rows={4}
            placeholder="Or paste CSV here:&#10;name,email,phone&#10;Rahul Sharma,rahul@example.com,9876543210"
            className="zook-focus min-h-20 rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-3 font-mono text-xs text-white/80 placeholder:text-white/25"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="Assign membership plan (optional)"
            placeholder="No plan"
            searchPlaceholder="Search plans"
            value={planId}
            onChange={setPlanId}
            options={[
              { value: "", label: "No plan — add as members only" },
              ...membershipPlans
                .filter((p) => p.active)
                .map((p) => ({
                  value: p.id,
                  label: p.name,
                  description: `${formatInr(p.pricePaise)}`,
                })),
            ]}
          />
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={activateSub}
                onChange={(e) => setActivateSub(e.target.checked)}
                disabled={!planId}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
              />
              Activate subscription immediately
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300"
              />
              Send welcome notification
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!csvText.trim() || busy}
            onClick={() => void runImport()}
            className="zook-focus rounded-full bg-lime-300 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import members"}
          </button>
          {importResult ? (
            <button
              type="button"
              onClick={() => {
                setCsvText("");
                setImportResult(null);
                setPlanId("");
                setActivateSub(false);
              }}
              className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              Reset
            </button>
          ) : null}
        </div>

        {importResult ? (
          <div className="rounded-[22px] border border-lime-200/15 bg-lime-200/8 p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Total</p>
                <p className="mt-1 text-lg font-bold text-white">{importResult.summary.total}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Created</p>
                <p className="mt-1 text-lg font-bold text-lime-300">{importResult.summary.created}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Existing</p>
                <p className="mt-1 text-lg font-bold text-blue-300">{importResult.summary.existing}</p>
              </div>
              {importResult.summary.errors > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">Errors</p>
                  <p className="mt-1 text-lg font-bold text-red-300">{importResult.summary.errors}</p>
                </div>
              ) : null}
            </div>
            {errorRows.length > 0 ? (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-red-300/15 bg-red-300/8 p-3">
                <p className="mb-2 text-xs font-semibold text-red-200">Failed rows</p>
                {errorRows.map((row) => (
                  <p key={row.row} className="text-xs text-red-200/70">
                    Row {row.row}: {row.email ?? "—"} — {row.error}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
