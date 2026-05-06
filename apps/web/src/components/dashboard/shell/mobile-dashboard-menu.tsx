import Link from "next/link";
import { Menu } from "lucide-react";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { translatedGroupLabel, translatedNavLabel } from "./copy";
import { filterNavGroups, isActiveNav } from "./nav";
import type { DashboardCopy } from "./types";

export function MobileDashboardMenu({
  visibleNavGroups,
  sectionKey,
  copy,
}: {
  visibleNavGroups: ReturnType<typeof filterNavGroups>;
  sectionKey: string;
  copy: DashboardCopy;
}) {
  return (
    <details className="group relative lg:hidden">
      <summary className="zook-focus flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/8 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Menu size={18} />
          {copy.common.openMenu}
        </span>
        <span className="text-xs text-white/40 group-open:hidden">{copy.nav.today}</span>
        <span className="hidden text-xs text-white/40 group-open:inline">{copy.common.closeMenu}</span>
      </summary>
      <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-[28px] border border-white/10 bg-zinc-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
        <nav className="grid gap-4">
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
                    className={`zook-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      active ? "bg-lime-300 text-black" : "text-white/70 hover:bg-white/8 hover:text-white"
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
        <div className="mt-4 border-t border-white/10 pt-3">
          <DashboardSignOutButton
            label={copy.common.signOut}
            busyLabel={copy.common.signingOut}
          />
        </div>
      </div>
    </details>
  );
}
