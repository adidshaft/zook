"use client";

import { X } from "lucide-react";
import { BodyCompositionTimeline } from "../body-composition-timeline";
import { ErrorNotice } from "../operational-shared";
import { ConfirmActionButton } from "../../confirm-action-button";
import { ManagedOn, SearchableSelect } from "../../ui";
import type { MemberDetailPayload, MembershipPlanRow } from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";
import type { ResourceState } from "./member-list/types";

function membershipStatusLabel(status?: string | null) {
  if (!status) return null;
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "PENDING" || normalized === "PENDING_PAYMENT") return "Pending";
  if (normalized === "PAUSED") return "Paused";
  if (normalized === "PAST_DUE" || normalized === "EXPIRED") return "Expired";
  if (normalized === "CANCELLED" || normalized === "FAILED" || normalized === "REJECTED") {
    return "Inactive";
  }
  return "Review";
}

function daysUntil(value?: string | Date | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.ceil((timestamp - Date.now()) / 86_400_000);
}

function daysSince(value?: string | Date | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.floor((Date.now() - timestamp) / 86_400_000);
}

export function MemberDetailDrawer({
  selectedMemberId,
  memberDetailState,
  membershipPlans,
  switchPlanId,
  setSwitchPlanId,
  pauseResumesAt,
  setPauseResumesAt,
  pauseReason,
  setPauseReason,
  subscriptionBusy,
  subscriptionStatus,
  subscriptionStatusTone,
  setSelectedMemberId,
  updateSubscription,
}: {
  selectedMemberId: string | null;
  memberDetailState: ResourceState<MemberDetailPayload>;
  membershipPlans: MembershipPlanRow[];
  switchPlanId: string;
  setSwitchPlanId: (planId: string) => void;
  pauseResumesAt: string;
  setPauseResumesAt: (value: string) => void;
  pauseReason: string;
  setPauseReason: (reason: string) => void;
  subscriptionBusy: string | null;
  subscriptionStatus: string;
  subscriptionStatusTone: "neutral" | "success" | "danger";
  setSelectedMemberId: (memberId: string | null) => void;
  updateSubscription: (action: "switch" | "pause" | "resume") => Promise<void>;
}) {
  if (!selectedMemberId) {
    return null;
  }

  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;
  const nextPlan = membershipPlans.find((plan) => plan.id === switchPlanId) ?? null;
  const canPause = selectedSubscription?.status === "ACTIVE";
  const canResume = selectedSubscription?.status === "PAUSED";
  const pauseActionLabel = pauseResumesAt ? `Pause until ${pauseResumesAt}` : "Pause membership";
  const loadedMember = memberDetailState.data?.member ?? null;
  const memberUser = loadedMember?.user ?? null;
  const hasContact = Boolean(memberUser?.email || memberUser?.phone);
  const subscriptionDaysLeft = daysUntil(selectedSubscription?.endsAt);
  const isSubscriptionExpiring =
    subscriptionDaysLeft != null && subscriptionDaysLeft >= 0 && subscriptionDaysLeft <= 14;
  const latestCheckIn = loadedMember?.attendance[0]?.checkedInAt ?? null;
  const inactiveDays = daysSince(latestCheckIn);
  const memberAction = !hasContact
    ? {
        title: "Complete contact details",
        detail: "Renewal nudges, receipts, and desk callbacks need at least one reliable contact method.",
        tone: "amber",
      }
    : !selectedSubscription || selectedSubscription.status !== "ACTIVE"
      ? {
          title: canResume ? "Resume paused access" : "Set up an active plan",
          detail: canResume
            ? "This member cannot check in until the paused membership resumes."
            : "No active membership is ready for attendance or renewal work.",
          tone: "amber",
        }
      : isSubscriptionExpiring
        ? {
            title: "Renewal conversation due",
            detail: `Membership ends in ${subscriptionDaysLeft} days. Confirm renewal before access lapses.`,
            tone: "amber",
          }
        : inactiveDays != null && inactiveDays >= 14
          ? {
              title: "Check on attendance",
              detail: `Last check-in was ${inactiveDays} days ago. A trainer or desk follow-up may help.`,
              tone: "neutral",
            }
          : {
              title: "Member record is ready",
              detail: "Contact, membership, and recent activity look ready for daily operations.",
              tone: "success",
            };

  return (
    <div className="relative mt-4 rounded-[22px] border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] p-5">
      <button
        type="button"
        onClick={() => setSelectedMemberId(null)}
        className="zook-focus absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
        aria-label="Close details"
      >
        <X size={16} />
      </button>
      {memberDetailState.error ? (
        <ErrorNotice message={memberDetailState.error} />
      ) : memberDetailState.loading || !memberDetailState.data ? (
        <div className="grid gap-3 lg:grid-cols-4" aria-label="Member detail is loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {memberUser?.name ?? "Member"}
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                  {memberAction.title}
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  {memberAction.detail}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-tertiary)]">
                  <span className="max-w-[240px] truncate">
                    {memberUser?.phone || memberUser?.email || "Contact missing"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedSubscription?.plan?.name ?? "No plan"}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {latestCheckIn ? `${inactiveDays ?? 0} days since check-in` : "No check-ins"}
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  memberAction.tone === "success"
                    ? "border-[color-mix(in_srgb,var(--feedback-success)_36%,transparent)] bg-[var(--surface-success-soft)] text-[var(--feedback-success)]"
                    : memberAction.tone === "amber"
                      ? "border-[color-mix(in_srgb,var(--feedback-warning)_38%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]"
                }`}
              >
                {memberAction.tone === "success"
                  ? "Ready"
                  : memberAction.tone === "amber"
                    ? "Needs work"
                    : "Watch"}
              </span>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Subscription
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {selectedSubscription?.plan?.name ?? "No plan"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {selectedSubscription
                  ? membershipStatusLabel(selectedSubscription.status)
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
                    className="zook-focus min-h-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {pauseReason.length}/180
                  </p>
                  <label className="grid gap-1 text-xs text-[var(--text-secondary)]">
                    Resume date
                    <input
                      type="date"
                      value={pauseResumesAt}
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                      onChange={(event) => setPauseResumesAt(event.target.value)}
                      className="zook-focus rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    />
                  </label>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Pause keeps the membership inactive until the selected resume date.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ConfirmActionButton
                      title="Switch membership plan?"
                      description={
                        nextPlan
                          ? `This changes the active membership immediately to ${nextPlan.name} (${formatInr(nextPlan.pricePaise)}).`
                          : "Choose a plan before switching this membership."
                      }
                      confirmLabel="Switch plan"
                      onConfirm={() => updateSubscription("switch")}
                      disabled={!switchPlanId || Boolean(subscriptionBusy)}
                      className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--accent-fill)] bg-[var(--accent-fill)] px-4 py-2 text-xs font-semibold text-[var(--text-on-accent)] transition duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-45"
                    >
                      {subscriptionBusy === "switch" ? "Switching..." : "Switch"}
                    </ConfirmActionButton>
                    {canPause ? (
                      <ConfirmActionButton
                        title="Pause membership?"
                        description={
                          pauseResumesAt
                            ? `Pause this membership until ${pauseResumesAt}. Check-ins stay inactive until the selected resume date.`
                            : "Choose a resume date before pausing this membership."
                        }
                        confirmLabel="Pause membership"
                        onConfirm={() => updateSubscription("pause")}
                        disabled={Boolean(subscriptionBusy) || !pauseResumesAt}
                        className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-transparent px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition duration-200 active:translate-y-px hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-45"
                      >
                        {subscriptionBusy === "pause" ? "Pausing..." : pauseActionLabel}
                      </ConfirmActionButton>
                    ) : null}
                    {canResume ? (
                      <ConfirmActionButton
                        title="Resume membership?"
                        description="Resume this paused membership now and re-enable member access immediately."
                        confirmLabel="Resume membership"
                        onConfirm={() => updateSubscription("resume")}
                        disabled={Boolean(subscriptionBusy)}
                        className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-transparent px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition duration-200 active:translate-y-px hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-45"
                      >
                        {subscriptionBusy === "resume" ? "Resuming..." : "Resume"}
                      </ConfirmActionButton>
                    ) : null}
                  </div>
                  {subscriptionStatus ? (
                    <p
                      className={`text-xs ${
                        subscriptionStatusTone === "danger"
                          ? "text-[var(--feedback-danger)]"
                          : subscriptionStatusTone === "success"
                            ? "text-[var(--feedback-success)]"
                            : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {subscriptionStatus}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Activity
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {memberDetailState.data.member.attendance.length} recent check-ins
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {memberDetailState.data.member.workouts.length} trainer-visible workouts
              </p>
              <ManagedOn surface="member-mobile" className="mt-3">
                Members log workouts, body, and habits in the mobile app.
              </ManagedOn>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Payments
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {memberDetailState.data.member.payments.length} recent records
              </p>
            </div>
            <div className="lg:col-span-3">
              <BodyCompositionTimeline entries={memberDetailState.data.member.bodyProgress ?? []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
