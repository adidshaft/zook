import Link from "next/link";
import { Shield } from "lucide-react";
import { GlassCard } from "../../glass-card";
import { ZookLogo } from "../../zook-logo";
import { translatedNavLabel } from "./copy";
import { filterNavGroups, isActiveNav } from "./nav";
import type { DashboardCopy, DashboardData } from "./types";

export function DashboardSidebar({
  data,
  visibleNavGroups,
  sectionKey,
  isPlatformAdmin,
  copy,
}: {
  data: DashboardData;
  visibleNavGroups: ReturnType<typeof filterNavGroups>;
  sectionKey: string;
  isPlatformAdmin: boolean;
  copy: DashboardCopy;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh lg:block">
      <GlassCard
        variant="strong"
        className="no-scrollbar flex h-full flex-col overflow-y-auto rounded-none border-y-0 border-l-0 bg-[#070908]/70 p-4 shadow-none"
      >
        <div className="flex items-center justify-between gap-3">
          <ZookLogo />
          <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-100">
            OS for gyms
          </span>
        </div>

        <nav className="mt-8 grid gap-1" aria-label="Dashboard navigation">
          {visibleNavGroups.map((group) => (
            <div key={group.key} className="grid gap-1">
              {group.items.map((item) => {
                const { href, icon: Icon } = item;
                const active = isActiveNav(href, sectionKey);
                const badgeValue = item.badgeKey ? data.summary[item.badgeKey] : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-lime-300/10 text-lime-300 before:absolute before:left-0 before:top-1/2 before:h-3/5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-lime-300"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="min-w-0 flex-1 truncate">{translatedNavLabel(copy, item)}</span>
                    {badgeValue > 0 ? (
                      <span className="rounded-full border border-lime-300/25 bg-lime-300/12 px-2 py-0.5 text-[10px] font-bold tabular-nums text-lime-200">
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
            className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
          >
            <Shield size={18} />
            {copy.nav.platformAdmin}
          </Link>
        ) : null}

        <div className="mt-auto rounded-[20px] border border-lime-300/18 bg-lime-300/[0.07] p-4">
          <p className="text-sm font-semibold text-white">Zook OS · India’s 1st Operating System for Gyms</p>
          <p className="mt-2 text-xs leading-5 text-white/48">
            Control room for memberships, QR attendance, desk payments, trainers, and audit logs.
          </p>
        </div>
      </GlassCard>
    </aside>
  );
}
