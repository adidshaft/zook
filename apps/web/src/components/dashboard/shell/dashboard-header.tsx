import { QrCode } from "lucide-react";
import { formatBranchName, joinModeLabel } from "@zook/core";
import { StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButtonLink } from "../../zook-button";
import { formatEnumLabel } from "@/lib/format";
import { BranchSwitcher } from "./branch-switcher";
import { UserMenu } from "./user-menu";
import type { DashboardCopy, DashboardData } from "./types";

export function DashboardHeader({
  activeOrg,
  selectedBranch,
  data,
  pageTitle,
  pageDescription,
  branchHref,
  runtimeLabel,
  canShowQr,
  canViewReports,
  user,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  pageTitle: string;
  pageDescription: string;
  branchHref: (branchId: string) => string;
  runtimeLabel: string;
  canShowQr: boolean;
  canViewReports: boolean;
  user: { name: string; email: string; preferredLocale?: string | null };
  copy: DashboardCopy;
}) {
  const trialEndsAt = activeOrg.trialEndAt ? new Date(activeOrg.trialEndAt) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft < 7;

  return (
    <GlassCard variant="strong" className="relative z-[100] min-w-0 overflow-visible">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-white/45">
            <ol className="flex flex-wrap items-center gap-2">
              <li>{activeOrg.name}</li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white/72">
                {pageTitle}
              </li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {runtimeLabel ? (
              <Pill tone={data.connected ? "lime" : "amber"}>{runtimeLabel}</Pill>
            ) : null}
            <StatusPill value={formatEnumLabel(activeOrg.status)} />
            <StatusPill value={joinModeLabel(activeOrg.joinMode)} tone="blue" />
            <StatusPill
              value={formatBranchName(selectedBranch)}
              tone={selectedBranch ? "lime" : "amber"}
            />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{pageDescription}</p>
          {data.branchScope.branches.length > 1 ? (
            <div className="mt-4">
              <BranchSwitcher
                branches={data.branchScope.branches}
                selectedBranchId={selectedBranch?.id}
                branchHref={branchHref}
                copy={copy}
              />
            </div>
          ) : null}
          {showTrialBanner ? (
            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/12 px-4 py-3 text-sm font-medium text-amber-50">
              Trial ends in {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}. Add billing
              before launch to keep this workspace active.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden text-right md:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-white/42">{user.email}</p>
          </div>
          {canShowQr ? (
            <ZookButtonLink
              href="/dashboard/attendance/qr-display"
              leadingIcon={<QrCode size={18} />}
            >
              {copy.dashboard.showQr}
            </ZookButtonLink>
          ) : null}
          {canViewReports ? (
            <ZookButtonLink href="/dashboard/reports" tone="secondary">
              {copy.dashboard.reports}
            </ZookButtonLink>
          ) : null}
          <UserMenu
            user={user}
            copy={copy}
            showSwitchOrganization={data.orgs.length > 1}
          />
        </div>
      </div>
    </GlassCard>
  );
}
