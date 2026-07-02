"use client";

import { ErrorNotice } from "../operational-shared";
import { formatCompactNumber } from "@/lib/format";
import { Pill } from "../../glass-card";
import { ReadoutGrid, Section, StatusPill, Toggle, TextInput, Select } from "../primitives";
import { ZookButton, ZookButtonLink } from "../../zook-button";
import type { DiscountType, RewardType } from "@/components/dashboard/types";
import { ReferralCodeControls } from "../sections/overview/referral-code-controls";
import { RouteFeedback } from "./route-feedback";
import type { GrowthRouteProps } from "./types";
import { webApiFetch } from "@/lib/api-client";
import { useT } from "@/lib/use-t";

const setupPresets = [
  {
    labelKey: "preset7Days",
    referrerRewardType: "DAYS" as RewardType,
    referrerRewardValue: "7",
    referredDiscountType: "PERCENTAGE" as DiscountType,
    referredDiscountValue: "1000",
  },
  {
    labelKey: "preset3Visits",
    referrerRewardType: "VISITS" as RewardType,
    referrerRewardValue: "3",
    referredDiscountType: "PERCENTAGE" as DiscountType,
    referredDiscountValue: "500",
  },
  {
    labelKey: "presetTrackingOnly",
    referrerRewardType: "NONE" as RewardType,
    referrerRewardValue: "0",
    referredDiscountType: "NONE" as DiscountType,
    referredDiscountValue: "0",
  },
];

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
  const t = useT("plans");
  const isDefaultPolicy =
    props.referralPolicy?.referrerRewardType === "DAYS" &&
    props.referralPolicy.referrerRewardValue === 7 &&
    props.referralPolicy.referredDiscountType === "PERCENTAGE" &&
    props.referralPolicy.referredDiscountValue === 1000;

  async function markRewardPaid(rewardId: string) {
    await webApiFetch(`/api/orgs/${props.orgId}/referral-rewards/${rewardId}/mark-paid`, {
      method: "POST",
    });
    window.location.reload();
  }

  return (
    <div className="grid gap-4">
      <Section
        eyebrow={t("referrals")}
        title={t("referralCodes")}
        description={t("referralsDescription")}
        badge={
          <Pill tone={props.referralPolicy?.enabled === false ? "amber" : "blue"}>
            {props.referralPolicy?.enabled === false ? t("paused") : t("enabled")}
          </Pill>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <ReadoutGrid
            columns={2}
            items={[
              {
                label: t("activeCodes"),
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.activeCodes ?? props.referrals.length,
                ),
                meta: t("availableNow"),
              },
              {
                label: t("thisMonth"),
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.redemptionsThisMonth ?? 0,
                ),
                meta: t("redemptions"),
              },
              {
                label: t("credits"),
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.rewardCreditsThisMonth ?? 0,
                ),
                meta: t("rewardsEarned"),
              },
              {
                label: t("applied"),
                value: formatCompactNumber(
                  props.referralAnalytics?.summary.appliedRewardsThisMonth ?? 0,
                ),
                meta: t("rewardsUsed"),
              },
            ]}
          />
          {isDefaultPolicy ? (
            <div className="rounded-[24px] border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="font-medium text-white">{t("setupReferrals")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {setupPresets.map((preset) => (
                  <button
                    key={preset.labelKey}
                    type="button"
                    className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-left text-sm text-white transition hover:border-lime-300/40"
                    onClick={() =>
                      props.setPolicyForm((current) => ({
                        ...current,
                        enabled: true,
                        referrerRewardType: preset.referrerRewardType,
                        referrerRewardValue: preset.referrerRewardValue,
                        referredDiscountType: preset.referredDiscountType,
                        referredDiscountValue: preset.referredDiscountValue,
                        maxReferralsPerMonth: "10",
                      }))
                    }
                  >
                    {t(preset.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="font-medium text-white">{t("topAdvocates")}</p>
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
                        {item.user?.email ?? item.code.createdByRole} ·{" "}
                        {t("redemptionsCount", { count: item.code.redemptionCount })}
                      </p>
                      <p className="text-xs text-white/35">
                        {t("abuseSignals", {
                          redemptions: item.abuseSignals?.redemptions24h ?? 0,
                          phones: item.abuseSignals?.uniqueInviteePhones ?? 0,
                        })}
                        {item.abuseSignals?.suspiciousClustering ? ` · ${t("flagged")}` : ""}
                      </p>
                    </div>
                    <StatusPill
                      value={item.code.status}
                      tone={item.code.status === "active" ? "blue" : "amber"}
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
                        {t("pauseCode")}
                      </ZookButton>
                      {item.code.referrerUserId ? (
                        <ZookButtonLink
                          tone="secondary"
                          size="sm"
                          href={`/dashboard/notifications?audience=single_member&userId=${encodeURIComponent(item.code.referrerUserId)}`}
                        >
                          {t("notify")}
                        </ZookButtonLink>
                      ) : (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/35">
                          {t("memberNotLinked")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/45">
                  {t("referralEmpty")}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <p className="font-medium text-white">{t("rewardsToClose")}</p>
            <div className="mt-3 grid gap-2">
              {(props.referralAnalytics?.pendingRewards ?? []).length ? (
                props.referralAnalytics!.pendingRewards!.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {reward.rewardValue} {reward.rewardType.toLowerCase()}
                      </p>
                      <p className="text-xs text-white/45">
                        {t("referrer", { id: reward.referrerUserId })}
                      </p>
                    </div>
                    <ZookButton
                      type="button"
                      tone="secondary"
                      size="sm"
                      onClick={() => void markRewardPaid(reward.id)}
                    >
                      {t("markPaid")}
                    </ZookButton>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/45">
                  {t("noUnpaidReferralCredits")}
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow={t("policy")} title={t("referralPolicy")} description={t("policyDescription")}>
        <div className="grid gap-4">
          {props.referralPolicyState.error ? (
            <ErrorNotice message={props.referralPolicyState.error} />
          ) : null}
          {props.referralAnalyticsState.error ? (
            <ErrorNotice message={props.referralAnalyticsState.error} />
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label={t("referrerReward")}
              value={props.policyForm.referrerRewardType}
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referrerRewardType: event.target.value as RewardType,
                }))
              }
              options={[
                { value: "DAYS", label: t("days") },
                { value: "VISITS", label: t("visits") },
                { value: "NONE", label: t("noReward") },
              ]}
            />
            <TextInput
              label={t("rewardValue")}
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
              label={t("monthlyLimit")}
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
              label={t("friendDiscount")}
              value={props.policyForm.referredDiscountType}
              onChange={(event) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  referredDiscountType: event.target.value as DiscountType,
                }))
              }
              options={[
                { value: "PERCENTAGE", label: t("percentage") },
                { value: "FIXED", label: t("fixedAmount") },
                { value: "NONE", label: t("noDiscount") },
              ]}
            />
            <TextInput
              label={t("discountValue")}
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
              label={t("maxDiscount")}
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
            {t("discountHelp")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Toggle
              label={t("referralProgram")}
              checked={props.policyForm.enabled}
              onCheckedChange={(checked) =>
                props.setPolicyForm((current) => ({ ...current, enabled: checked }))
              }
            />
            <Toggle
              label={t("trainerCodes")}
              checked={props.policyForm.trainerReferralEnabled}
              onCheckedChange={(checked) =>
                props.setPolicyForm((current) => ({
                  ...current,
                  trainerReferralEnabled: checked,
                }))
              }
            />
            <Toggle
              label={t("staffCodes")}
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
              {props.formBusy === "referral-policy" ? t("saving") : t("savePolicy")}
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
