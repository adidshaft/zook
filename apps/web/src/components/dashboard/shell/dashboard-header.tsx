import { Bell, Building2, Calendar, ChevronDown, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";
import { ThemeToggleButton } from "@/components/theme-preference-switcher";
import type { DashboardCopy, DashboardData } from "./types";

export function DashboardHeader({
  activeOrg,
  selectedBranch,
  data,
  branchHref,
  runtimeLabel,
  user,
  roleLabel,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  branchHref: (branchId: string) => string;
  runtimeLabel: string;
  user: { name: string; email: string; preferredLocale?: string | null };
  roleLabel?: string | undefined;
  copy: DashboardCopy;
}) {
  const trialEndsAt = activeOrg.trialEndAt ? new Date(activeOrg.trialEndAt) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft < 7;
  const locationLabel = [activeOrg.city, activeOrg.state].filter(Boolean).join(", ");

  return (
    <div className="sticky top-0 z-[var(--z-header)] -mx-3 border-b border-[var(--border-subtle)] bg-[var(--bg)]/92 px-3 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:mx-0 lg:px-5">
      <div className="flex min-h-[var(--header-height)] flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            <Building2 className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
            <span className="truncate">
              {activeOrg.name}
              {locationLabel ? ` · ${locationLabel}` : ""}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
          </div>
          {data.branchScope.branches.length > 0 ? (
            <BranchSwitcher
              branches={data.branchScope.branches}
              selectedBranchId={data.branchScope.allBranches ? "all" : selectedBranch?.id}
              allBranchesAllowed={data.branchScope.allBranchesAllowed}
              branchHref={branchHref}
              copy={copy}
            />
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Today
          </div>
          {runtimeLabel && !data.connected ? (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--feedback-warning)_25%,transparent)] bg-[var(--surface-warning-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--feedback-warning)]">
              {runtimeLabel}
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto hidden min-h-10 w-full max-w-[480px] flex-1 items-center md:flex">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search members, invoices, plans..."
            className="zook-focus h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] pl-10 pr-16 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
            ⌘ K
          </kbd>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/pricing"
            target="_blank"
            rel="noreferrer"
            className="zook-focus hidden min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] sm:inline-flex"
          >
            Pricing
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <ThemeToggleButton />
          <div className="relative grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {data.summary.notificationQueueCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-fill)] px-1 text-[10px] font-black tabular-nums text-[var(--text-on-accent)]">
                {data.summary.notificationQueueCount}
              </span>
            ) : null}
          </div>
          <UserMenu
            user={user}
            roleLabel={roleLabel}
            copy={copy}
            showSwitchOrganization={data.orgs.length > 1}
          />
        </div>
      </div>

      {showTrialBanner ? (
        <div className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--feedback-warning)_34%,transparent)] bg-[var(--surface-warning-soft)] px-4 py-2 text-sm font-medium text-[var(--feedback-warning)]">
          Trial ends in {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}. Add billing
          before launch to keep this gym active.
        </div>
      ) : null}
    </div>
  );
}
