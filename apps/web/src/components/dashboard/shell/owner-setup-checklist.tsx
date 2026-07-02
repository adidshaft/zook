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
  const profileBlocker = !hasBranch
    ? copy.dashboard.missingBranchBlocker
    : !activeOrg.city
      ? copy.dashboard.missingCityBlocker
      : activeOrg.status !== "ACTIVE"
        ? copy.dashboard.inactiveGymBlocker
        : "";
  const checklist = [
    {
      label: copy.dashboard.completeGymProfile,
      detail: copy.dashboard.completeGymProfileDetail,
      blocker: profileBlocker,
      href: "/dashboard/public-profile",
      done: profileReady,
    },
    {
      label: copy.dashboard.createFirstPlanStep,
      detail: copy.dashboard.createFirstPlanDetail,
      blocker: planCreated
        ? ""
        : copy.dashboard.createFirstPlanBlocker,
      href: "/dashboard/plans",
      done: planCreated,
    },
    {
      label: copy.dashboard.inviteTeam,
      detail: copy.dashboard.inviteTeamDetail,
      blocker:
        (summary.staffCount ?? 0) > 1
          ? ""
          : copy.dashboard.inviteTeamBlocker,
      href: "/dashboard/staff",
      done: (summary.staffCount ?? 0) > 1,
    },
    {
      label: copy.dashboard.shareGymLink,
      detail: copy.dashboard.shareGymLinkDetail,
      blocker:
        summary.joinRequests > 0 || summary.activeMembers > 0
          ? ""
          : copy.dashboard.shareGymLinkBlocker,
      href: "/dashboard/public-profile",
      done: summary.joinRequests > 0 || summary.activeMembers > 0,
    },
  ];
  const completed = checklist.filter((item) => item.done).length;
  const nextStep = checklist.find((item) => !item.done);

  if (completed === checklist.length || !nextStep) {
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
              href={nextStep.href}
              size="md"
              trailingIcon={<ArrowRight size={16} />}
            >
              {nextStep.label}
            </ZookButtonLink>
            <span className="text-sm text-[var(--text-tertiary)]">
              {interpolate(copy.dashboard.setupComplete, {
                completed,
                total: checklist.length,
              })}
            </span>
          </div>
          {nextStep.blocker ? (
            <p className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
              {nextStep.blocker}
            </p>
          ) : null}
          <div
            className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--bg-sunken)]"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={checklist.length}
            aria-label={copy.dashboard.setupProgressLabel}
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
            const current = item.href === nextStep.href && item.label === nextStep.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group rounded-[22px] border p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)] ${
                  current
                    ? "border-[var(--accent)] bg-[var(--surface-accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-raised)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={20}
                    className={
                      item.done ? "mt-0.5 shrink-0 text-[var(--accent)]" : "mt-0.5 shrink-0 text-[var(--text-tertiary)]"
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">
                      {item.label}
                      {current ? (
                        <span className="ml-2 rounded-full bg-[var(--accent-fill)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-on-accent)]">
                          {copy.dashboard.nextStep}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.detail}</p>
                    {!item.done && item.blocker ? (
                      <p className="mt-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-xs leading-5 text-[var(--text-tertiary)]">
                        {item.blocker}
                      </p>
                    ) : null}
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
