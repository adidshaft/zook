"use client";

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
  pauseReason,
  setPauseReason,
  subscriptionBusy,
  subscriptionStatus,
  setSelectedMemberId,
  updateSubscription,
}: {
  selectedMemberId: string | null;
  memberDetailState: ResourceState<MemberDetailPayload>;
  membershipPlans: MembershipPlanRow[];
  switchPlanId: string;
  setSwitchPlanId: (planId: string) => void;
  pauseReason: string;
  setPauseReason: (reason: string) => void;
  subscriptionBusy: string | null;
  subscriptionStatus: string;
  setSelectedMemberId: (memberId: string | null) => void;
  updateSubscription: (action: "switch" | "pause" | "resume") => void;
}) {
  if (!selectedMemberId) {
    return null;
  }

  const selectedSubscription = memberDetailState.data?.member.subscriptions[0] ?? null;

  return (
    <div className="mt-4 rounded-[22px] border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] p-4">
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
                  <p className="text-xs text-[var(--text-tertiary)]">{subscriptionStatus}</p>
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
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => setSelectedMemberId(null)}
              className="mt-2"
            >
              Close
            </ZookButton>
          </div>
          <BodyCompositionTimeline entries={memberDetailState.data.member.bodyProgress ?? []} />
        </div>
      )}
    </div>
  );
}
