import { Bell, Building2, Calendar, ChevronDown, Search } from "lucide-react";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";
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
    <div className="sticky top-0 z-40 -mx-3 border-b border-white/10 bg-[#070908]/92 px-3 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:mx-0 lg:px-5">
      <div className="flex min-h-[var(--header-height)] flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white/75">
            <Building2 className="h-4 w-4 shrink-0 text-white/55" aria-hidden="true" />
            <span className="truncate">
              {activeOrg.name}
              {locationLabel ? ` · ${locationLabel}` : ""}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
          </div>
          {data.branchScope.branches.length > 0 ? (
            <BranchSwitcher
              branches={data.branchScope.branches}
              selectedBranchId={selectedBranch?.id}
              branchHref={branchHref}
              copy={copy}
              compact
            />
          ) : null}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white/70">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Today
          </div>
          {runtimeLabel && !data.connected ? (
            <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              {runtimeLabel}
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto hidden min-h-10 w-full max-w-[480px] flex-1 items-center md:flex">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/42" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search members, invoices, plans..."
            className="zook-focus h-11 w-full rounded-lg border border-white/10 bg-black/20 pl-10 pr-16 text-sm text-white placeholder:text-white/35"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-white/40">
            ⌘ K
          </kbd>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-black/20 text-white/70">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {data.summary.notificationQueueCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-black tabular-nums text-black">
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
        <div className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-50">
          Trial ends in {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}. Add billing
          before launch to keep this gym active.
        </div>
      ) : null}
    </div>
  );
}
