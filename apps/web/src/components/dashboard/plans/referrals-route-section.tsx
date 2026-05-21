"use client";

import { ErrorNotice } from "../operational-shared";
import { formatCompactNumber } from "@/lib/format";
import { Pill } from "../../glass-card";
import { ReadoutGrid, Section, StatusPill, Toggle, TextInput, Select } from "../primitives";
import { ZookButton, ZookButtonLink } from "../../zook-button";
import type { DiscountType, RewardType } from "../../dashboard-operational-model";
import { ReferralCodeControls } from "../sections/overview/referral-code-controls";
import { RouteFeedback } from "./route-feedback";
import type { GrowthRouteProps } from "./types";

const copy = {
  referralsDescription:
    "Create member, staff, and trainer referral codes with clear monthly limits.",
  referralEmpty: "Referral performance appears after the first share.",
  policyDescription: "Set the reward, friend discount, and monthly cap.",
  maxDiscount: "Maximum discount (%)",
};

function bpsToPercent(value: string) {
  if (!value.trim()) return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? String(amount / 100) : value;
}

function percentToBps(value: string) {
  if (!value.trim()) return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? String(Math.round(amount * 100)) : value;
}

export function ReferralsRouteSection(props: GrowthRouteProps) {
  return (
    <div className="grid gap-4">
      <Section
        eyebrow="Referrals"
        title="Referral codes"
        description={copy.referralsDescription}
        badge={
          <Pill tone={props.referralPolicy?.enabled === false ? "amber" : "lime"}>
            {props.referralPolicy?.enabled === false ? "Paused" : "Enabled"}
          </Pill>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <ReadoutGrid
            columns={2}
            items={[
              {
                label: "Active codes",
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.activeCodes ?? props.referrals.length,
                ),
                meta: "Available now",
              },
              {
                label: "This month",
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.redemptionsThisMonth ?? 0,
                ),
                meta: "Redemptions",
              },
              {
                label: "Credits",
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.rewardCreditsThisMonth ?? 0,
                ),
                meta: "Rewards earned",
              },
              {
                label: "Applied",
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.appliedRewardsThisMonth ?? 0,
                ),
                meta: "Rewards used",
              },
            ]}
          />
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="font-medium text-white">Top referrers</p>
            <div className="mt-3 grid gap-2">
              {(props.referralAnalytics?.topReferrers ?? []).length ? (
                props.referralAnalytics!.topReferrers.map((item) => (
                  <div
                    key={item.code.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{item.code.code}</p>
                      <p className="text-xs text-white/45">
                        {item.user?.email ?? item.code.createdByRole} · {item.code.redemptionCount}{" "}
                        redemptions
                      </p>
                    </div>
                    <StatusPill
                      value={item.code.status}
                      tone={item.code.status === "active" ? "lime" : "amber"}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        disabled={props.formBusy === `referral:${item.code.id}`}
                        state={props.formBusy === `referral:${item.code.id}` ? "loading" : "idle"}
                        onClick={() => void props.updateReferral(item.code, "paused")}
                      >
                        Pause code
                      </ZookButton>
                      {item.code.referrerUserId ? (
                        <ZookButtonLink
                          tone="secondary"
                          size="sm"
                          href={`/dashboard/notifications?audience=single_member&userId=${encodeURIComponent(item.code.referrerUserId)}`}
                        >
                          Notify
                        </ZookButtonLink>
                      ) : (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/35">
                          Member not linked
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/45">
                  {copy.referralEmpty}
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Policy" title="Referral policy" description={copy.policyDescription}>
        <div className="grid gap-4">
          {props.referralPolicyState.error ? (
            <ErrorNotice message={props.referralPolicyState.error} />
          ) : null}
          {props.referralAnalyticsState.error ? (
            <ErrorNotice message={props.referralAnalyticsState.error} />
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Referrer reward"
              value={props.policyForm.referrerRewardType}
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referrerRewardType: event.target.value as RewardType,
                }))
              }
              options={[
                { value: "DAYS", label: "Days" },
                { value: "VISITS", label: "Visits" },
                { value: "NONE", label: "No reward" },
              ]}
            />
            <TextInput
              label="Reward value"
              value={props.policyForm.referrerRewardValue}
              inputMode="numeric"
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referrerRewardValue: event.target.value,
                }))
              }
            />
            <TextInput
              label="Monthly limit"
              value={props.policyForm.maxReferralsPerMonth}
              inputMode="numeric"
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  maxReferralsPerMonth: event.target.value,
                }))
              }
            />
            <Select
              label="Friend discount"
              value={props.policyForm.referredDiscountType}
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referredDiscountType: event.target.value as DiscountType,
                }))
              }
              options={[
                { value: "PERCENTAGE", label: "Percentage" },
                { value: "FIXED", label: "Fixed amount" },
                { value: "NONE", label: "No discount" },
              ]}
            />
            <TextInput
              label="Discount value"
              value={props.policyForm.referredDiscountValue}
              inputMode="numeric"
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referredDiscountValue: event.target.value,
                }))
              }
            />
            <TextInput
              label={copy.maxDiscount}
              value={bpsToPercent(props.policyForm.maxDiscountCapBps)}
              inputMode="numeric"
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  maxDiscountCapBps: percentToBps(event.target.value),
                }))
              }
            />
          </div>
          <p className="text-xs leading-5 text-white/45">
            For percentage discounts, enter the visible percent value. For fixed discounts, enter
            rupees.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Toggle
              label="Referral program"
              checked={props.policyForm.enabled}
              onCheckedChange={(checked) =>
                props.setPolicyForm((current) => ({ ...current, enabled: checked }))
              }
            />
            <Toggle
              label="Trainer codes"
              checked={props.policyForm.trainerReferralEnabled}
              onCheckedChange={(checked) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  trainerReferralEnabled: checked,
                }))
              }
            />
            <Toggle
              label="Staff codes"
              checked={props.policyForm.staffReferralEnabled}
              onCheckedChange={(checked) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  staffReferralEnabled: checked,
                }))
              }
            />
            <ZookButton
              type="button"
              onClick={() => void props.saveReferralPolicy()}
              disabled={props.formBusy === "referral-policy"}
              state={props.formBusy === "referral-policy" ? "loading" : "idle"}
              className="ml-auto"
            >
              {props.formBusy === "referral-policy" ? "Saving..." : "Save policy"}
            </ZookButton>
          </div>
          <ReferralCodeControls
            coupons={props.coupons}
            referrals={props.referrals}
            referralUsersById={props.referralUsersById}
            referralForm={props.referralForm}
            setReferralForm={props.setReferralForm}
            formBusy={props.formBusy}
            createReferral={props.createReferral}
            updateReferral={props.updateReferral}
          />
          <RouteFeedback error={props.formError} status={props.formStatus} />
        </div>
      </Section>
    </div>
  );
}
