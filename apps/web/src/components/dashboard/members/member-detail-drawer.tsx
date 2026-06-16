"use client";

import { X } from "lucide-react";
import { BodyCompositionTimeline } from "../body-composition-timeline";
import { ErrorNotice } from "../operational-shared";
import { ManagedOn, SearchableSelect } from "../../ui";
import { ZookButton } from "../../zook-button";
import type { MemberDetailPayload, MembershipPlanRow } from "@/components/dashboard/types";
import { formatEnumLabel, formatInr } from "@/lib/format";
import type { ResourceState } from "./member-list/types";

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
  updateSubscription: (action: "switch" | "pause" | "resume") => void;
}) {
  if (!selectedMemberId) {
    return null;
  }

  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;

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
        <div className="grid gap-3 lg:grid-cols-4" aria-label="Member detail is refreshing">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Member
            </p>
            <p className="mt-2 font-medium text-[var(--text-primary)]">
              {memberDetailState.data.member.user?.name ?? "Member"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {memberDetailState.data.member.user?.email ?? "No email"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Subscription
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {selectedSubscription?.plan?.name ?? "No plan"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {selectedSubscription ? formatEnumLabel(selectedSubscription.status) : "No subscription"}
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
                <p className="text-[11px] text-[var(--text-tertiary)]">{pauseReason.length}/180</p>
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
                  <ZookButton
                    type="button"
                    size="sm"
                    disabled={!switchPlanId || Boolean(subscriptionBusy)}
                    state={subscriptionBusy === "switch" ? "loading" : "idle"}
                    onClick={() => updateSubscription("switch")}
                  >
                    Switch
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    disabled={Boolean(subscriptionBusy) || selectedSubscription.status !== "ACTIVE"}
                    state={subscriptionBusy === "pause" ? "loading" : "idle"}
                    onClick={() => updateSubscription("pause")}
                  >
                    Pause 7d
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    disabled={Boolean(subscriptionBusy) || selectedSubscription.status !== "PAUSED"}
                    state={subscriptionBusy === "resume" ? "loading" : "idle"}
                    onClick={() => updateSubscription("resume")}
                  >
                    Resume
                  </ZookButton>
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
          <BodyCompositionTimeline entries={memberDetailState.data.member.bodyProgress ?? []} />
        </div>
      )}
    </div>
  );
}
