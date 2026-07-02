"use client";

import { formatEnumLabel, formatUsageLimit } from "@/lib/format";
import { useT } from "@/lib/use-t";
import { Pill } from "../../glass-card";
import type { SubscriptionDetail } from "./billing-section-types";

function usageLine(used: number, limit: number | null) {
  return `${formatEnumLabel(String(used))} / ${formatUsageLimit(limit)}`;
}

export function BillingUsageLimitsCard({ subscription }: { subscription: SubscriptionDetail }) {
  const t = useT("billing");
  const usageItems = [
    [
      t("members"),
      usageLine(subscription.usage.activeMemberCount, subscription.entitlements.memberLimit),
    ],
    [t("branches"), usageLine(subscription.usage.branchCount, subscription.entitlements.branchLimit)],
    [t("staff"), usageLine(subscription.usage.staffCount, subscription.entitlements.staffLimit)],
    [
      t("trainers"),
      usageLine(subscription.usage.trainerCount, subscription.entitlements.trainerLimit),
    ],
    [t("products"), usageLine(subscription.usage.productCount, subscription.entitlements.productLimit)],
    [
      t("notificationsPerMonth"),
      usageLine(
        subscription.usage.notificationMonthlyCount,
        subscription.entitlements.notificationMonthlyLimit,
      ),
    ],
    [
      t("aiTextPerMonth"),
      usageLine(subscription.usage.aiTextMonthlyCount, subscription.entitlements.aiTextMonthlyLimit),
    ],
    [
      t("aiImagesPerMonth"),
      usageLine(
        subscription.usage.aiImageMonthlyCount,
        subscription.entitlements.aiImageMonthlyLimit,
      ),
    ],
    [t("reports"), formatEnumLabel(subscription.entitlements.reports)],
    [t("support"), formatEnumLabel(subscription.entitlements.support)],
    [t("referrals"), formatEnumLabel(subscription.entitlements.referrals)],
    [t("onboarding"), formatEnumLabel(subscription.entitlements.onboarding)],
  ];

  return (
    <details className="xl:col-span-2 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Pill>{t("tierLimits", { tier: formatEnumLabel(subscription.subscription.tier) })}</Pill>
            <span className="ml-2 text-sm font-semibold text-[var(--text-primary)]">
              {t("planPackaging")}
            </span>
            <span className="ml-2 text-xs text-[var(--text-secondary)]">
              {t("usageAndLimits")}
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--accent-strong)]">{t("view")}</span>
        </div>
      </summary>
      <div className="mt-4">
        <div className="mb-3">
          <Pill>{t("tierLimits", { tier: formatEnumLabel(subscription.subscription.tier) })}</Pill>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t("usageLimitsDescription")}
          </p>
        </div>
        <div className="grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-4">
          {usageItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3"
            >
              <p className="truncate text-xs text-[var(--text-tertiary)]">{label}</p>
              <p className="mt-1 truncate font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
