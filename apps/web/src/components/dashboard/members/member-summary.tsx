"use client";

import Link from "next/link";
import { UserCheck, Users } from "lucide-react";
import { KPITile } from "../charts";
import { GlassCard, Pill } from "../../glass-card";
import type { JoinRequestRow, MemberRow } from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";

export function MemberSummary({
  members,
  joinRequests,
}: {
  members: MemberRow[];
  joinRequests: JoinRequestRow[];
}) {
  const t = useT("members");
  const activeCount = members.filter((member) => {
    const status = (member.activeSubscription?.status ?? "").toUpperCase();
    return status === "ACTIVE";
  }).length;
  const expiringCount = members.filter((member) => {
    const endsAt = member.activeSubscription?.endsAt;
    if (!endsAt) return false;
    const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;
  const pausedCount = members.filter((member) => {
    const status = (member.activeSubscription?.status ?? "").toUpperCase();
    return status === "PAUSED";
  }).length;
  const missingContactCount = members.filter((member) => !member.user?.email && !member.user?.phone)
    .length;
  const queueItems = [
    {
      label: t("approveRequests"),
      count: joinRequests.length,
      copy: joinRequests.length
        ? t("approveRequestsWaiting")
        : t("approveRequestsEmpty"),
      href: "/dashboard/members/join-requests",
      tone: joinRequests.length ? "amber" : "neutral",
    },
    {
      label: t("renewalsDue"),
      count: expiringCount,
      copy: expiringCount
        ? t("renewalsDueWaiting")
        : t("renewalsDueEmpty"),
      href: "/dashboard/members?status=Expiring+Soon",
      tone: expiringCount ? "amber" : "neutral",
    },
    {
      label: t("missingContact"),
      count: missingContactCount,
      copy: missingContactCount
        ? t("missingContactWaiting")
        : t("missingContactEmpty"),
      href: "/dashboard/members?status=Missing+Contact",
      tone: missingContactCount ? "amber" : "neutral",
    },
    {
      label: t("pausedAccess"),
      count: pausedCount,
      copy: pausedCount ? t("pausedAccessWaiting") : t("pausedAccessEmpty"),
      href: "/dashboard/members?status=Paused",
      tone: pausedCount ? "blue" : "neutral",
    },
  ] as const;
  const activeQueueItems = queueItems.filter((item) => item.count > 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{t("rosterTitle")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {members.length} {members.length === 1 ? t("memberOne") : t("memberOther")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KPITile
          label={t("totalMembers")}
          value={members.length}
          icon={Users}
          tone="sky"
          noTrendLabel={t("noTrend")}
        />
        <KPITile
          label={t("active")}
          value={activeCount}
          icon={UserCheck}
          tone="sky"
          noTrendLabel={t("noTrend")}
          caption={t("ofRoster", {
            percent: members.length > 0 ? Math.round((activeCount / members.length) * 100) : 0,
          })}
        />
      </div>
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {t("workQueue")}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {t("workQueueTitle")}
            </h2>
          </div>
          <Link
            href="/dashboard/members"
            className="zook-focus rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            {t("openRoster")}
          </Link>
        </div>
        {activeQueueItems.length ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {activeQueueItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="zook-focus grid gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  <Pill tone={item.tone}>{item.count}</Pill>
                </div>
                <p className="text-xs leading-5 text-[var(--text-secondary)]">{item.copy}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {t("noExceptions")}
          </p>
        )}
      </GlassCard>
    </>
  );
}
