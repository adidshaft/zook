import { Bell, ExternalLink } from "lucide-react";
import Link from "next/link";
import { BranchSwitcher } from "./branch-switcher";
import { GymSelectClient, type GymSelectOption } from "./gym-select-client";
import { UserMenu } from "./user-menu";
import { ThemeToggleButton } from "@/components/theme-preference-switcher";
import type { DashboardCopy, DashboardData } from "./types";

export function DashboardHeader({
  activeOrg,
  organizations,
  selectedBranch,
  data,
  branchHref,
  gymHref,
  runtimeLabel,
  user,
  roleLabel,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  organizations: Array<{
    orgId: string;
    name: string;
    logoUrl?: string | null;
    city?: string | null;
    state?: string | null;
    status: string;
  }>;
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  branchHref: (branchId: string) => string;
  gymHref: (orgId: string) => string;
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
  const headerLocationLabel = selectedBranch?.city ?? activeOrg.city;
  const gymOptions: GymSelectOption[] = organizations.map((organization) => ({
    value: organization.orgId,
    label: organization.name,
    description: [organization.city, organization.state].filter(Boolean).join(", ") || undefined,
    logoUrl: organization.logoUrl ?? null,
    href: gymHref(organization.orgId),
  }));

  return (
    <div className="sticky top-0 z-[var(--z-header)] -mx-3 border-b border-[var(--border-subtle)] bg-[var(--bg)]/92 px-3 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:mx-0 lg:px-5">
      <div className="flex min-h-[var(--header-height)] flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="w-full min-w-[16rem] max-w-[30rem] sm:w-auto">
            <GymSelectClient
              options={gymOptions}
              activeOrgId={activeOrg.id}
              labels={copy.webUx.gymSwitcher}
            />
          </div>
          {data.branchScope.branches.length > 0 ? (
            <BranchSwitcher
              organizationName={activeOrg.name}
              fallbackLocation={headerLocationLabel}
              branches={data.branchScope.branches}
              selectedBranchId={data.branchScope.allBranches ? "all" : selectedBranch?.id}
              allBranchesAllowed={data.branchScope.allBranchesAllowed}
              branchHref={branchHref}
              copy={copy}
            />
          ) : (
            <div className="flex min-h-12 min-w-0 max-w-full items-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] sm:max-w-[22rem]">
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-4 text-[var(--text-primary)]">
                  {activeOrg.name}
                </span>
                {headerLocationLabel ? (
                  <span className="mt-0.5 block truncate text-[11px] leading-3 text-[var(--text-tertiary)]">
                    {headerLocationLabel}
                  </span>
                ) : null}
              </span>
            </div>
          )}
          {runtimeLabel && !data.connected ? (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--feedback-warning)_25%,transparent)] bg-[var(--surface-warning-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--feedback-warning)]">
              {runtimeLabel}
            </div>
          ) : null}
        </div>

        <div className="hidden flex-1 md:block" aria-hidden="true" />

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
          <Link
            href="/dashboard/notifications"
            aria-label={
              data.summary.notificationQueueCount > 0
                ? `View notifications (${data.summary.notificationQueueCount} pending)`
                : "View notifications"
            }
            className="zook-focus relative grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {data.summary.notificationQueueCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-fill)] px-1 text-[10px] font-black tabular-nums text-[var(--text-on-accent)]">
                {data.summary.notificationQueueCount}
              </span>
            ) : null}
          </Link>
          <UserMenu
            user={user}
            roleLabel={roleLabel}
            copy={copy}
            showSwitchOrganization={organizations.length > 1}
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
