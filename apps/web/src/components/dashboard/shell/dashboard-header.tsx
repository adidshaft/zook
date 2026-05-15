import Link from "next/link";
import { ArrowRight, ClipboardCheck, QrCode } from "lucide-react";
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
          {runtimeLabel && !data.connected ? (
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="amber">{runtimeLabel}</Pill>
            </div>
          ) : null}
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
            <Link
              href="/dashboard/billing"
              className="zook-focus mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/12 px-4 py-3 text-sm font-medium text-amber-50 transition hover:border-amber-300/50 hover:bg-amber-300/18"
            >
              <span>
                Trial ends in {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}. Set up
                billing to keep this gym active.
              </span>
              <span className="flex shrink-0 items-center gap-1 text-amber-50/90">
                Set up billing
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </Link>
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
