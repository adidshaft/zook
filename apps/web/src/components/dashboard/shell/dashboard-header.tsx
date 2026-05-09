import { Bell, CalendarDays, ClipboardCheck, QrCode, Search } from "lucide-react";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButtonLink } from "../../zook-button";
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
  canOpenDesk,
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
  canOpenDesk: boolean;
  user: { name: string; email: string; preferredLocale?: string | null };
  copy: DashboardCopy;
}) {
  const trialEndsAt = activeOrg.trialEndAt ? new Date(activeOrg.trialEndAt) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft >= 0 && trialDaysLeft < 7;
  const qrHref = selectedBranch?.id
    ? `/dashboard/attendance/qr-display?branchId=${encodeURIComponent(selectedBranch.id)}`
    : "/dashboard/attendance/qr-display";

  return (
    <GlassCard variant="strong" className="relative z-[100] min-w-0 overflow-visible">
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="lime">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            Today
          </Pill>
          {selectedBranch ? <Pill tone="blue">{selectedBranch.name}</Pill> : null}
          {runtimeLabel && !data.connected ? <Pill tone="amber">{runtimeLabel}</Pill> : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="hidden min-h-11 w-full max-w-[420px] items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 text-sm text-white/38 md:flex">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search members, invoices, plans...
          </div>
          <div className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/25 text-white/70">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {data.summary.notificationQueueCount > 0 ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff5a3d] ring-2 ring-[#070908]" />
            ) : null}
          </div>
        </div>
      </div>
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
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {pageTitle}
          </h1>
          {pageDescription ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{pageDescription}</p>
          ) : null}
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
              before launch to keep this gym active.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canOpenDesk ? (
            <ZookButtonLink
              href="/desk"
              tone="secondary"
              leadingIcon={<ClipboardCheck size={18} />}
            >
              Reception Desk
            </ZookButtonLink>
          ) : null}
          {canShowQr ? (
            <ZookButtonLink
              href={qrHref}
              target="_blank"
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
          <UserMenu user={user} copy={copy} showSwitchOrganization={data.orgs.length > 1} />
        </div>
      </div>
    </GlassCard>
  );
}
