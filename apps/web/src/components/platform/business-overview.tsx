import Link from "next/link";

import { EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { formatCompactNumber, formatInr } from "@/lib/format";

type SubscriptionSummary = {
  active: number;
  onTrial: number;
  totalReferrals: number;
};

type SubscriptionRow = {
  orgStatus: string;
  subscriptionStatus: string | null;
  tier?: string | null;
  billingCycle?: string | null;
  priceLockedPaise?: number | null;
};

type PlatformPlanCatalog = Record<
  string,
  {
    monthly: number;
    semiannual?: number;
    yearly: number;
  }
>;

type RewardWithdrawalRow = {
  amountPaise: number;
  status: string;
};

type PlatformAbuseFlag = {
  resolvedAt?: string | Date | null;
  status: string;
};

export function PlatformBusinessOverview({
  summary,
  rows,
  planCatalog,
  withdrawals,
  flags,
  loading,
}: {
  summary: SubscriptionSummary | null;
  rows: SubscriptionRow[];
  planCatalog: PlatformPlanCatalog | null;
  withdrawals: RewardWithdrawalRow[] | null;
  flags: PlatformAbuseFlag[];
  loading: boolean;
}) {
  const pending = (withdrawals ?? []).filter((withdrawal) => withdrawal.status === "REQUESTED");
  const pendingPaise = pending.reduce((total, withdrawal) => total + withdrawal.amountPaise, 0);
  const suspendedRows = rows.filter((row) => row.orgStatus === "SUSPENDED");
  const openFlags = flags.filter(
    (flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved",
  );
  const payingRows = rows.filter(
    (row) => row.subscriptionStatus === "ACTIVE" || row.orgStatus === "ACTIVE",
  );
  const mrrPaise = payingRows.reduce((total, row) => {
    const plan = planCatalog?.[row.tier ?? "FREE"];
    const monthly = row.priceLockedPaise ?? plan?.monthly ?? 0;
    if (row.billingCycle === "YEARLY") {
      return total + Math.round((row.priceLockedPaise ?? plan?.yearly ?? 0) / 12);
    }
    if (row.billingCycle === "SEMIANNUAL") {
      return total + Math.round((row.priceLockedPaise ?? plan?.semiannual ?? monthly * 6) / 6);
    }
    return total + monthly;
  }, 0);
  const trialToPaid =
    summary && summary.active + summary.onTrial > 0
      ? Math.round((summary.active / (summary.active + summary.onTrial)) * 100)
      : 0;
  const needsYou = [
    {
      label: "Reward payouts to release",
      value: pending.length ? `${pending.length} · ${formatInr(pendingPaise)}` : "Clear",
      href: "/platform/referrals",
      tone: pending.length ? "amber" : "neutral",
    },
    {
      label: "Refunds to reconcile",
      value: "Open ledger",
      href: "/platform/payments",
      tone: "neutral",
    },
    {
      label: "Suspended gyms",
      value: suspendedRows.length ? String(suspendedRows.length) : "Clear",
      href: "/platform/gyms",
      tone: suspendedRows.length ? "amber" : "neutral",
    },
    {
      label: "Open abuse flags",
      value: openFlags.length ? String(openFlags.length) : "Clear",
      href: "/platform/safety",
      tone: openFlags.length ? "amber" : "neutral",
    },
  ] as const;

  const kpis: Array<{ label: string; value: string; meta: string }> = summary
    ? [
        { label: "MRR estimate", value: formatInr(mrrPaise), meta: "Active subs × tier monthly" },
        {
          label: "Paying gyms",
          value: formatCompactNumber(summary.active),
          meta: `${trialToPaid}% trial → paid`,
        },
        {
          label: "On trial",
          value: formatCompactNumber(summary.onTrial),
          meta: "Follow up before expiry",
        },
        {
          label: "Gym referrals",
          value: formatCompactNumber(summary.totalReferrals),
          meta: "Partnerships created",
        },
        { label: "Payout exposure", value: formatInr(pendingPaise), meta: "Requested withdrawals" },
      ]
    : [];

  return (
    <GlassCard className="rounded-[24px] p-5">
      <SectionHeader eyebrow="Business" title="Command overview" />
      {summary ? (
        <ReadoutGrid className="mt-5" items={kpis} columns={4} />
      ) : loading ? (
        <p className="mt-4 text-sm text-white/45">Loading business overview...</p>
      ) : (
        <EmptyState title="No business data" />
      )}
      <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
              Needs you
            </p>
            <p className="mt-1 text-sm text-white/55">
              One queue for owner decisions and money movement.
            </p>
          </div>
          <Pill tone={needsYou.some((item) => item.tone === "amber") ? "amber" : "neutral"}>
            {needsYou.filter((item) => item.tone === "amber").length || "Clear"}
          </Pill>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {needsYou.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="zook-focus rounded-[16px] border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
            >
              <StatusPill value={item.label} tone={item.tone} />
              <p className="mt-3 text-lg font-semibold tabular-nums text-white">{item.value}</p>
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
