"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Shield,
} from "lucide-react";
import { GlassCard } from "../../glass-card";
import { ZookLogo } from "../../zook-logo";
import { translatedGroupLabel, translatedNavLabel } from "./copy";
import { isActiveNav, NAV_ICONS } from "./nav";
import { prefetchDashboardHref } from "./prefetch";
import type { DashboardCopy, DashboardData } from "./types";

type SidebarNavGroup = {
  key: keyof DashboardCopy["navGroups"];
  items: Array<{
    key: string;
    label: string;
    href: string;
    shortLabel?: string | undefined;
    indent?: boolean | undefined;
    badgeKey?:
      | "joinRequests"
      | "lowStockProducts"
      | "notificationQueueCount"
      | "pendingAttendanceApprovals"
      | undefined;
  }>;
};


export function DashboardSidebar({
  data,
  visibleNavGroups,
  sectionKey,
  isPlatformAdmin,
  copy,
}: {
  data: DashboardData;
  visibleNavGroups: SidebarNavGroup[];
  sectionKey: string;
  isPlatformAdmin: boolean;
  copy: DashboardCopy;
}) {
  const queryClient = useQueryClient();
  const activeOrgId = data.orgs[0]?.id;
  const activeBranchId = data.branchScope.allBranches
    ? "all"
    : data.branchScope.selectedBranch?.id;

  function prefetchSection(href: string) {
    prefetchDashboardHref({ queryClient, href, orgId: activeOrgId, branchId: activeBranchId });
  }

  return (
    <aside className="sticky top-0 hidden h-dvh lg:block">
      <GlassCard
        variant="strong"
        className="no-scrollbar flex h-full flex-col overflow-y-auto rounded-none border-y-0 border-l-0 bg-[var(--surface-raised)]/70 p-4 shadow-none"
      >
        <div className="flex items-center justify-between gap-3">
          <ZookLogo />
          <span className="rounded-full border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
            OS for gyms
          </span>
        </div>

        <nav className="mt-8 grid gap-1" aria-label="Dashboard navigation">
          {visibleNavGroups.map((group) => (
            <div key={group.key} className="grid gap-1">
              <p className="px-3 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60 first:pt-0">
                {translatedGroupLabel(copy, group.key)}
              </p>
              {group.items.map((item) => {
                const { href } = item;
                const Icon = NAV_ICONS[item.key] ?? Bot;
                const active = isActiveNav(href, sectionKey);
                const badgeValue = item.badgeKey ? data.summary[item.badgeKey] : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    onMouseEnter={() => prefetchSection(href)}
                    onFocus={() => prefetchSection(href)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 py-2.5 text-sm transition ${
                      item.indent
                        ? "ml-5 pl-3 border-l border-[var(--border-subtle)] rounded-l-none rounded-r-xl"
                        : "px-3 rounded-xl"
                    } ${
                      active
                        ? "bg-[var(--surface-accent-soft)] text-[var(--accent-strong)] before:absolute before:left-0 before:top-1/2 before:h-3/5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-[var(--accent-strong)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="min-w-0 flex-1 truncate">{translatedNavLabel(copy, item)}</span>
                    {badgeValue > 0 ? (
                      <span className="rounded-full border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--accent-strong)]">
                        {badgeValue}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {isPlatformAdmin ? (
          <Link
            href="/platform"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            <Shield size={18} />
            {copy.nav.platformAdmin}
          </Link>
        ) : null}
      </GlassCard>
    </aside>
  );
}
