"use client";

import Link from "next/link";
import { BodyCompositionTimeline } from "../body-composition-timeline";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import {
  formatPlanShape,
  type JoinRequestRow,
  type MemberDetailPayload,
  type MemberRow,
  type MembershipPlanRow,
  type OrganizationSnapshot,
} from "../../dashboard-operational-model";
import { formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";

type MembersState = {
  error: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
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
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="xl:col-span-1">
          <SectionHeader
            eyebrow="Members"
            title="Member roster"
            description="Profiles come from the member directory."
            badge={<Pill tone="lime">{members.length} profiles</Pill>}
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/members.csv`} />}
          />
          {selectedMemberId ? (
            <div className="mt-4 rounded-[22px] border border-lime-200/15 bg-lime-200/8 p-4">
              {memberDetailState.error ? (
                <ErrorNotice message={memberDetailState.error} />
              ) : memberDetailState.loading || !memberDetailState.data ? (
                <p className="text-sm text-white/55">Loading member detail...</p>
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
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Activity</p>
                    <p className="mt-2 text-sm text-white/70">
                      {memberDetailState.data.member.attendance.length} recent check-ins
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {memberDetailState.data.member.workouts.length} trainer-visible workouts
                    </p>
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
                  rows={members}
                  rowKey={(row) => row.profile.id}
                  empty={
                    <EmptyState
                      title="No members yet"
                      description="Create your first membership plan and share your join link to start accepting members."
                      action={
                        <Link
                          href="/dashboard/plans"
                          className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                        >
                          Create a plan
                        </Link>
                      }
                    />
                  }
                />
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
                        {request.message ?? "No intake note was added by the member."}
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
    </div>
  );
}
