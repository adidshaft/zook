import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { GlassCard } from "../../glass-card";
import { ZookButtonLink } from "../../zook-button";
import { interpolate } from "./copy";
import type { DashboardCopy, DashboardData } from "./types";

export function OwnerSetupChecklist({
  activeOrg,
  hasBranch,
  summary,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  hasBranch: boolean;
  summary: DashboardData["summary"];
  copy: DashboardCopy;
}) {
  const profileReady = activeOrg.status === "ACTIVE" && hasBranch && Boolean(activeOrg.city);
  const planCreated = (summary.plansCount ?? 0) > 0;
  const checklist = [
    {
      label: copy.dashboard.completeGymProfile,
      detail: copy.dashboard.completeGymProfileDetail,
      href: "/dashboard/public-profile",
      done: profileReady,
    },
    {
      label: copy.dashboard.createFirstPlanStep,
      detail: copy.dashboard.createFirstPlanDetail,
      href: "/dashboard/plans",
      done: planCreated,
    },
    {
      label: copy.dashboard.inviteTeam,
      detail: copy.dashboard.inviteTeamDetail,
      href: "/dashboard/staff",
      done: (summary.staffCount ?? 0) > 1,
    },
    {
      label: copy.dashboard.shareGymLink,
      detail: copy.dashboard.shareGymLinkDetail,
      href: "/dashboard/public-profile",
      done: summary.joinRequests > 0 || summary.activeMembers > 0,
    },
  ];
  const completed = checklist.filter((item) => item.done).length;

  if (completed === checklist.length) {
    return null;
  }

  return (
    <GlassCard variant="strong" className="overflow-hidden">
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr] xl:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
            {copy.dashboard.setupEyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {interpolate(copy.dashboard.setupTitle, { orgName: activeOrg.name })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {copy.dashboard.setupDescription}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ZookButtonLink
              href="/dashboard/plans"
              size="md"
              trailingIcon={<ArrowRight size={16} />}
            >
              {copy.dashboard.createFirstPlan}
            </ZookButtonLink>
            <span className="text-sm text-[var(--text-tertiary)]">
              {interpolate(copy.dashboard.setupComplete, {
                completed,
                total: checklist.length,
              })}
            </span>
          </div>
          <div
            className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--bg-sunken)]"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={checklist.length}
            aria-label="Getting started progress"
          >
            <div
              className="h-full rounded-full bg-[var(--accent-fill)] transition-all duration-500"
              style={{ width: `${(completed / checklist.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {checklist.map((item) => {
            const Icon = item.done ? CheckCircle2 : Circle;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={20}
                    className={
                      item.done ? "mt-0.5 shrink-0 text-[var(--accent)]" : "mt-0.5 shrink-0 text-[var(--text-tertiary)]"
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
