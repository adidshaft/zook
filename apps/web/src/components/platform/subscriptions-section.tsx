"use client";

import { useEffect, useState } from "react";

import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
  toneFromStatus,
} from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { webApiFetch } from "@/lib/api-client";
import {
  formatCompactNumber,
  formatDate,
  formatEnumLabel,
  formatInr,
  formatUsageLimit,
} from "@/lib/format";
import { PlatformBusinessOverview } from "./business-overview";
import { PlatformReferralPolicyCard } from "./referral-policy-card";
import { PlatformWithdrawalsCard, type RewardWithdrawalRow } from "./withdrawals-card";

type PlatformAbuseFlag = {
  status: string;
  resolvedAt?: string | Date | null;
};

type SubscriptionSummary = {
  totalOrgs: number;
  onTrial: number;
  active: number;
  suspended: number;
  cancelled: number;
  totalReferrals: number;
};

type SubscriptionRow = {
  orgId: string;
  orgName: string;
  username: string;
  orgStatus: string;
  trialEndAt: string | Date | null;
  createdAt: string | Date;
  contactEmail: string | null;
  subscriptionStatus: string | null;
  tier?: string | null;
  billingCycle?: string | null;
  priceLockedPaise?: number | null;
  creditPaise?: number | null;
  noteForPlatform?: string | null;
  nextBillingAt: string | Date | null;
  mandateStatus: string | null;
  mandateNextChargeAt: string | Date | null;
  mandatePaidCount: number;
  referredCount: number;
  usage?: {
    activeMemberCount?: number;
    branchCount?: number;
    staffCount?: number;
    trainerCount?: number;
    productCount?: number;
  };
  entitlements?: {
    memberLimit?: number | null;
    branchLimit?: number | null;
    staffLimit?: number | null;
    trainerLimit?: number | null;
    productLimit?: number | null;
    notificationMonthlyLimit?: number | null;
    aiTextMonthlyLimit?: number | null;
    aiImageMonthlyLimit?: number | null;
    reports?: string;
    support?: string;
    referrals?: string;
  };
};

type PlatformPlanCatalog = Record<
  string,
  {
    name: string;
    monthly: number;
    semiannual?: number;
    yearly: number;
    entitlements: NonNullable<SubscriptionRow["entitlements"]>;
  }
>;

export function PlatformSubscriptionsSection({
  mode,
  initialFlags,
}: {
  mode: "overview" | "subscriptions" | "referrals";
  initialFlags: PlatformAbuseFlag[];
}) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [planCatalog, setPlanCatalog] = useState<PlatformPlanCatalog | null>(null);
  const [withdrawals, setWithdrawals] = useState<RewardWithdrawalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const limitFormatOptions = { compact: true, unlimitedLabel: "unlimited" };

  useEffect(() => {
    let mounted = true;
    webApiFetch<{ summary: SubscriptionSummary; rows: SubscriptionRow[]; planCatalog?: PlatformPlanCatalog }>(
      "/api/platform/subscriptions",
    )
      .then((payload) => {
        if (!mounted) return;
        setSummary(payload.summary);
        setRows(payload.rows);
        setPlanCatalog(payload.planCatalog ?? null);
      })
      .catch((cause) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load subscriptions.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    void webApiFetch<{ withdrawals: RewardWithdrawalRow[] }>("/api/platform/rewards/withdrawals")
      .then((payload) => {
        if (mounted) setWithdrawals(payload.withdrawals);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const pendingWithdrawalExposurePaise = (withdrawals ?? [])
    .filter((row) => row.status === "REQUESTED")
    .reduce((total, row) => total + row.amountPaise, 0);

  return (
    <div id="subscriptions" className="scroll-mt-5">
      <PlatformBusinessOverview
        summary={summary}
        rows={rows}
        planCatalog={planCatalog}
        withdrawals={withdrawals}
        flags={initialFlags}
        loading={loading}
      />
      {mode !== "overview" ? (
        <GlassCard className="mt-5">
          <SectionHeader
            eyebrow={mode === "referrals" ? "Referral economics" : "Subscriptions"}
            title={mode === "referrals" ? "Rewards, payouts, and policy" : "Gym subscriptions"}
          />
          {summary ? (
            <ReadoutGrid
              className="mt-5"
              items={[
                {
                  label: "Total gyms",
                  value: formatCompactNumber(summary.totalOrgs),
                  meta: "All accounts",
                },
                {
                  label: "On trial",
                  value: formatCompactNumber(summary.onTrial),
                  meta: "Active + expiring",
                },
                {
                  label: "Paying",
                  value: formatCompactNumber(summary.active),
                  meta: "Status active",
                },
                {
                  label: "Suspended",
                  value: formatCompactNumber(summary.suspended),
                  meta: "Needs review",
                },
                {
                  label: "Cancelled",
                  value: formatCompactNumber(summary.cancelled),
                  meta: "Off platform",
                },
                {
                  label: "Referrals",
                  value: formatCompactNumber(summary.totalReferrals),
                  meta: "Gym-to-gym",
                },
              ]}
              columns={3}
            />
          ) : null}
          <PlatformReferralPolicyCard monthlyPayoutExposurePaise={pendingWithdrawalExposurePaise} />
          <PlatformWithdrawalsCard />
          {mode === "referrals" ? null : (
            <div className="mt-5">
              {planCatalog ? (
                <div className="mb-5 grid gap-3 lg:grid-cols-3">
                  {(["STARTER", "GROWTH", "PRO"] as const).map((tier) => {
                    const plan = planCatalog[tier];
                    if (!plan) return null;
                    return (
                      <div key={tier} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{plan.name ?? formatEnumLabel(tier)}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {formatInr(plan.monthly)} / mo · {formatInr(plan.yearly)} / yr
                            </p>
                          </div>
                          <StatusPill value={tier} tone={tier === "PRO" ? "lime" : "blue"} />
                        </div>
                        <p className="mt-3 text-xs leading-5 text-white/52">
                          {formatUsageLimit(plan.entitlements.memberLimit, limitFormatOptions)} members ·{" "}
                          {formatUsageLimit(plan.entitlements.branchLimit, limitFormatOptions)} branches ·{" "}
                          {formatUsageLimit(plan.entitlements.staffLimit, limitFormatOptions)} staff ·{" "}
                          {formatUsageLimit(plan.entitlements.productLimit, limitFormatOptions)} products
                        </p>
                        <p className="mt-2 text-xs leading-5 text-white/42">
                          {formatUsageLimit(plan.entitlements.notificationMonthlyLimit, limitFormatOptions)} message recipients/mo ·{" "}
                          {formatUsageLimit(plan.entitlements.aiTextMonthlyLimit, limitFormatOptions)} AI text/mo ·{" "}
                          {formatEnumLabel(plan.entitlements.support ?? "standard")} support
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {error ? (
                <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </p>
              ) : loading ? (
                <p className="text-sm text-white/45">Loading subscriptions...</p>
              ) : rows.length ? (
                <DataTable<SubscriptionRow>
                  columns={[
                    {
                      id: "name",
                      header: "Gym",
                      render: (row: SubscriptionRow) => (
                        <div>
                          <p className="font-medium text-white">{row.orgName}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.username} · {row.contactEmail ?? "no email"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {formatEnumLabel(row.tier ?? "FREE")} · {formatEnumLabel(row.billingCycle ?? "MONTHLY")}
                            {row.creditPaise ? ` · ${formatInr(row.creditPaise)} credit` : ""}
                          </p>
                          {row.noteForPlatform ? (
                            <p className="mt-1 max-w-xs truncate text-xs text-white/45">
                              Note: {row.noteForPlatform}
                            </p>
                          ) : null}
                          {row.usage ? (
                            <p className="mt-1 text-xs text-white/45">
                              {formatCompactNumber(row.usage.activeMemberCount ?? 0)} /{" "}
                              {formatUsageLimit(row.entitlements?.memberLimit, limitFormatOptions)} members ·{" "}
                              {formatCompactNumber(row.usage.branchCount ?? 0)} /{" "}
                              {formatUsageLimit(row.entitlements?.branchLimit, limitFormatOptions)} branches
                            </p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (row: SubscriptionRow) => (
                        <StatusPill
                          value={formatEnumLabel(row.orgStatus)}
                          tone={toneFromStatus(row.orgStatus)}
                        />
                      ),
                    },
                    {
                      id: "trial",
                      header: "Trial end",
                      render: (row: SubscriptionRow) => (row.trialEndAt ? formatDate(row.trialEndAt) : "—"),
                    },
                    {
                      id: "mandate",
                      header: "Autopay",
                      render: (row: SubscriptionRow) =>
                        row.mandateStatus ? (
                          <div>
                            <StatusPill
                              value={formatEnumLabel(row.mandateStatus)}
                              tone={toneFromStatus(row.mandateStatus)}
                            />
                            <p className="mt-1 text-xs text-white/45">
                              {row.mandatePaidCount} cycles paid
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-white/45">Not set up</span>
                        ),
                    },
                    {
                      id: "nextCharge",
                      header: "Next charge",
                      render: (row: SubscriptionRow) =>
                        row.mandateNextChargeAt
                          ? formatDate(row.mandateNextChargeAt)
                          : row.nextBillingAt
                            ? formatDate(row.nextBillingAt)
                            : "—",
                    },
                    {
                      id: "referred",
                      header: "Gyms referred",
                      render: (row: SubscriptionRow) =>
                        row.referredCount > 0 ? (
                          <Pill>{row.referredCount}</Pill>
                        ) : (
                          <span className="text-xs text-white/45">0</span>
                        ),
                    },
                  ]}
                  rows={rows}
                  rowKey={(row) => row.orgId}
                  empty={<EmptyState title="No subscriptions" />}
                />
              ) : (
                <EmptyState title="No subscriptions" />
              )}
            </div>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
