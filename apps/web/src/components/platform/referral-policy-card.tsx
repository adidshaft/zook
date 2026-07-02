"use client";

import { useEffect, useState } from "react";

import { Pill, type PillTone } from "../glass-card";
import { ZookButton } from "../zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/format";

type PlatformReferralPolicy = {
  enabled: boolean;
  referrerRewardType: "TRIAL_DAYS" | "CREDIT_PAISE" | "NONE";
  referrerRewardValue: number;
  referredRewardType: "TRIAL_DAYS" | "DISCOUNT_PERCENT_BPS" | "CREDIT_PAISE" | "NONE";
  referredRewardValue: number;
  nonOwnerSemiannualRewardPaise: number;
  nonOwnerYearlyRewardPaise: number;
  ownerRewardDays: number;
  qualifyingCycles: Array<"SEMIANNUAL" | "YEARLY">;
  clawbackWindowDays: number;
  minWithdrawalPaise: number;
  maxRewardsPerUserPerMonth: number;
  maxRedemptionsPerOrg: number;
  expiresInDays: number;
};

const REFERRER_REWARD_TYPES = [
  { value: "TRIAL_DAYS", label: "Free trial days" },
  { value: "CREDIT_PAISE", label: "Account credit (₹)" },
  { value: "NONE", label: "No reward" },
] as const;

const REFERRED_REWARD_TYPES = [
  { value: "TRIAL_DAYS", label: "Free trial days" },
  { value: "DISCOUNT_PERCENT_BPS", label: "Discount (%)" },
  { value: "CREDIT_PAISE", label: "Account credit (₹)" },
  { value: "NONE", label: "No reward" },
] as const;

const platformInputClass =
  "min-h-10 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/25";

function rewardToDisplay(type: string, value: number) {
  if (type === "CREDIT_PAISE") return Math.round(value / 100);
  if (type === "DISCOUNT_PERCENT_BPS") return Math.round(value / 100);
  return value;
}

function rewardToStored(type: string, value: number) {
  if (type === "CREDIT_PAISE") return value * 100;
  if (type === "DISCOUNT_PERCENT_BPS") return value * 100;
  return value;
}

function rewardCostPaise(type: string, value: number) {
  return type === "CREDIT_PAISE" ? value : 0;
}

function rewardLabel(type: string, value: number) {
  if (type === "NONE") return "No reward";
  if (type === "CREDIT_PAISE") return formatInr(value);
  if (type === "DISCOUNT_PERCENT_BPS") return `${Math.round(value / 100)}%`;
  return `${value} days`;
}

function defaultRewardValueForType(type: string) {
  if (type === "CREDIT_PAISE" || type === "NONE") return 0;
  if (type === "DISCOUNT_PERCENT_BPS") return 1_000;
  return 30;
}

export function PlatformReferralPolicyCard({
  monthlyPayoutExposurePaise = 0,
}: {
  monthlyPayoutExposurePaise?: number;
}) {
  const [policy, setPolicy] = useState<PlatformReferralPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: PillTone } | null>(null);

  useEffect(() => {
    let mounted = true;
    webApiFetch<{ policy: PlatformReferralPolicy }>("/api/platform/referral-policy")
      .then((payload) => {
        if (mounted) setPolicy(payload.policy);
      })
      .catch((cause) => {
        if (mounted) {
          setNotice({
            message: cause instanceof Error ? cause.message : "Unable to load referral policy.",
            tone: "red",
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function patch(next: Partial<PlatformReferralPolicy>) {
    setPolicy((current) => (current ? { ...current, ...next } : current));
  }

  function num(value: string) {
    return Number.parseInt(value, 10) || 0;
  }

  async function save() {
    if (!policy) return;
    setSaving(true);
    setNotice(null);
    try {
      await webApiFetch("/api/platform/referral-policy", { method: "PATCH", body: policy });
      setNotice({ message: "Referral policy saved.", tone: "lime" });
    } catch (cause) {
      setNotice({
        message: cause instanceof Error ? cause.message : "Unable to save referral policy.",
        tone: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  const costPerReferralPaise = policy
    ? rewardCostPaise(policy.referrerRewardType, policy.referrerRewardValue) +
      rewardCostPaise(policy.referredRewardType, policy.referredRewardValue)
    : 0;

  return (
    <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Gym-to-gym referrals
          </p>
          <p className="mt-1 text-sm font-semibold text-white">When a gym refers a new gym to Zook</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-white/45">
            Platform default that applies across all gyms. Sets what the referring gym earns and what
            the new gym gets when they join.
          </p>
        </div>
        <button
          type="button"
          onClick={() => patch({ enabled: !policy?.enabled })}
          disabled={!policy}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            policy?.enabled
              ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
              : "border-white/10 bg-white/5 text-white/55"
          }`}
        >
          {policy?.enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-white/45">Loading referral policy...</p>
      ) : policy ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Cost / gym referral
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {costPerReferralPaise ? formatInr(costPerReferralPaise) : "Non-cash"}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                {rewardLabel(policy.referrerRewardType, policy.referrerRewardValue)} referrer ·{" "}
                {rewardLabel(policy.referredRewardType, policy.referredRewardValue)} new gym
              </p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Monthly payout exposure
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {formatInr(monthlyPayoutExposurePaise)}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Pending member/trainer withdrawal cash.
              </p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Reward limits
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {policy.maxRewardsPerUserPerMonth}/user
              </p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                {policy.maxRedemptionsPerOrg} redemptions/gym · {policy.clawbackWindowDays}d clawback
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Referring gym earns</p>
              <label className="mt-3 block text-xs text-white/55">Reward type</label>
              <select
                className={`${platformInputClass} mt-1`}
                value={policy.referrerRewardType}
                onChange={(event) => {
                  const referrerRewardType = event.target.value as PlatformReferralPolicy["referrerRewardType"];
                  patch({
                    referrerRewardType,
                    referrerRewardValue: defaultRewardValueForType(referrerRewardType),
                  });
                }}
              >
                {REFERRER_REWARD_TYPES.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
              {policy.referrerRewardType !== "NONE" ? (
                <>
                  <label className="mt-3 block text-xs text-white/55">
                    {policy.referrerRewardType === "CREDIT_PAISE" ? "Credit (₹)" : "Days"}
                  </label>
                  <input
                    className={`${platformInputClass} mt-1`}
                    inputMode="numeric"
                    value={String(rewardToDisplay(policy.referrerRewardType, policy.referrerRewardValue))}
                    onChange={(event) =>
                      patch({ referrerRewardValue: rewardToStored(policy.referrerRewardType, num(event.target.value)) })
                    }
                  />
                </>
              ) : null}
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">New gym gets</p>
              <label className="mt-3 block text-xs text-white/55">Reward type</label>
              <select
                className={`${platformInputClass} mt-1`}
                value={policy.referredRewardType}
                onChange={(event) => {
                  const referredRewardType = event.target.value as PlatformReferralPolicy["referredRewardType"];
                  patch({
                    referredRewardType,
                    referredRewardValue: defaultRewardValueForType(referredRewardType),
                  });
                }}
              >
                {REFERRED_REWARD_TYPES.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
              {policy.referredRewardType !== "NONE" ? (
                <>
                  <label className="mt-3 block text-xs text-white/55">
                    {policy.referredRewardType === "CREDIT_PAISE"
                      ? "Credit (₹)"
                      : policy.referredRewardType === "DISCOUNT_PERCENT_BPS"
                        ? "Discount (%)"
                        : "Days"}
                  </label>
                  <input
                    className={`${platformInputClass} mt-1`}
                    inputMode="numeric"
                    value={String(rewardToDisplay(policy.referredRewardType, policy.referredRewardValue))}
                    onChange={(event) =>
                      patch({ referredRewardValue: rewardToStored(policy.referredRewardType, num(event.target.value)) })
                    }
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Member / trainer refers a gym</p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Cash a non-owner earns when a gym they refer subscribes (paid out after the clawback
                window).
              </p>
              <label className="mt-3 block text-xs text-white/55">6-month sub → cash (₹)</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(Math.round(policy.nonOwnerSemiannualRewardPaise / 100))}
                onChange={(event) => patch({ nonOwnerSemiannualRewardPaise: num(event.target.value) * 100 })}
              />
              <label className="mt-3 block text-xs text-white/55">Yearly sub → cash (₹)</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(Math.round(policy.nonOwnerYearlyRewardPaise / 100))}
                onChange={(event) => patch({ nonOwnerYearlyRewardPaise: num(event.target.value) * 100 })}
              />
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Gym owner refers a gym</p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Free Zook subscription days the owner earns (no cash).
              </p>
              <label className="mt-3 block text-xs text-white/55">Free Zook days</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(policy.ownerRewardDays)}
                onChange={(event) => patch({ ownerRewardDays: num(event.target.value) })}
              />
              <label className="mt-3 block text-xs text-white/55">Qualifying commitments</label>
              <div className="mt-1 flex gap-2">
                {(["SEMIANNUAL", "YEARLY"] as const).map((cycle) => {
                  const active = policy.qualifyingCycles.includes(cycle);
                  return (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() =>
                        patch({
                          qualifyingCycles: active
                            ? policy.qualifyingCycles.filter((value) => value !== cycle)
                            : [...policy.qualifyingCycles, cycle],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
                          : "border-white/10 bg-white/5 text-white/55"
                      }`}
                    >
                      {cycle === "SEMIANNUAL" ? "6-month" : "Yearly"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs text-white/55">Clawback window (days)</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(policy.clawbackWindowDays)}
                onChange={(event) => patch({ clawbackWindowDays: num(event.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-white/55">Min withdrawal (₹)</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(Math.round(policy.minWithdrawalPaise / 100))}
                onChange={(event) => patch({ minWithdrawalPaise: num(event.target.value) * 100 })}
              />
            </div>
            <div>
              <label className="block text-xs text-white/55">Max rewards / user / month</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(policy.maxRewardsPerUserPerMonth)}
                onChange={(event) => patch({ maxRewardsPerUserPerMonth: Math.max(1, num(event.target.value)) })}
              />
            </div>
            <div>
              <label className="block text-xs text-white/55">Max referrals per gym</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(policy.maxRedemptionsPerOrg)}
                onChange={(event) => patch({ maxRedemptionsPerOrg: Math.max(1, num(event.target.value)) })}
              />
            </div>
            <div>
              <label className="block text-xs text-white/55">Reward expires in (days)</label>
              <input
                className={`${platformInputClass} mt-1`}
                inputMode="numeric"
                value={String(policy.expiresInDays)}
                onChange={(event) => patch({ expiresInDays: Math.max(1, num(event.target.value)) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ZookButton size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save referral policy"}
            </ZookButton>
            {notice ? <Pill tone={notice.tone}>{notice.message}</Pill> : null}
          </div>
        </div>
      ) : notice ? (
        <p className="mt-4 rounded-[18px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
