import Link from "next/link";
import { Shield } from "lucide-react";
import { formatBranchName, joinModeLabel } from "@zook/core";
import { ReadoutGrid, StatusPill } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { ZookLogo } from "../../zook-logo";
import { formatDate, formatDaysRemaining, formatEnumLabel } from "@/lib/format";
import { translatedGroupLabel, translatedNavLabel } from "./copy";
import { filterNavGroups, isActiveNav } from "./nav";
import type { DashboardCopy, DashboardData } from "./types";

export function DashboardSidebar({
  activeOrg,
  selectedBranch,
  data,
  visibleNavGroups,
  sectionKey,
  isPlatformAdmin,
  copy,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  visibleNavGroups: ReturnType<typeof filterNavGroups>;
  sectionKey: string;
  isPlatformAdmin: boolean;
  copy: DashboardCopy;
}) {
  return (
    <aside className="sticky top-4 hidden h-fit lg:block">
      <GlassCard variant="strong" className="no-scrollbar max-h-[calc(100dvh-2rem)] overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <ZookLogo />
          <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-100">
            OS for gyms
          </span>
        </div>
        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
            {copy.dashboard.liveOrganization}
          </p>
          <p className="mt-3 text-lg font-semibold text-white">{activeOrg.name}</p>
          <p className="mt-1 text-sm text-white/48">
            {activeOrg.city}
            {activeOrg.state ? `, ${activeOrg.state}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill value={formatEnumLabel(activeOrg.status)} />
            <StatusPill value={joinModeLabel(activeOrg.joinMode)} tone="blue" />
            <StatusPill
              value={formatBranchName(selectedBranch)}
              tone={selectedBranch ? "lime" : "amber"}
            />
          </div>
        </div>

        <nav className="mt-6 grid gap-5" aria-label="Dashboard navigation">
          {visibleNavGroups.map((group) => (
            <div key={group.key} className="grid gap-1">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/30">
                {translatedGroupLabel(copy, group.key)}
              </p>
              {group.items.map((item) => {
                const { href, icon: Icon } = item;
                const active = isActiveNav(href, sectionKey);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-lime-300/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-lime-300"
                        : "text-white/62 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {translatedNavLabel(copy, item)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {isPlatformAdmin ? (
          <Link
            href="/platform"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
          >
            <Shield size={18} />
            {copy.nav.platformAdmin}
          </Link>
        ) : null}

        <div className="mt-6 rounded-[24px] border border-lime-300/18 bg-lime-300/[0.07] p-4">
          <p className="text-sm font-semibold text-white">Zook OS · India’s 1st Operating System for Gyms</p>
          <p className="mt-2 text-xs leading-5 text-white/48">
            Control room for memberships, QR attendance, desk payments, trainers, and audit logs.
          </p>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
            {copy.dashboard.gymStatus}
          </p>
          <ReadoutGrid
            className="mt-4"
            columns={1}
            items={[
              {
                label: copy.dashboard.branchScope,
                value: formatBranchName(selectedBranch),
                meta: copy.dashboard.branchScopeMeta,
              },
              {
                label: copy.dashboard.attendanceMode,
                value: formatEnumLabel(activeOrg.attendanceMode),
                meta: `${data.summary.todayAttendance} ${copy.dashboard.checkInsToday}`,
              },
              {
                label: copy.dashboard.trialRunway,
                value: formatDaysRemaining(data.summary.trialDaysRemaining),
                meta: formatDate(activeOrg.trialEndAt),
              },
              {
                label: copy.dashboard.primaryContact,
                value: activeOrg.contactEmail ?? activeOrg.contactPhone ?? copy.common.deskOwned,
                meta: copy.dashboard.primaryContact,
              },
            ]}
          />
        </div>
      </GlassCard>
    </aside>
  );
}
