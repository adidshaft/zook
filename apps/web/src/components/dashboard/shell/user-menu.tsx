import Link from "next/link";
import { UserCircle2 } from "lucide-react";
import { DashboardLocaleToggle } from "../../dashboard-locale-toggle";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import type { DashboardCopy } from "./types";

export function UserMenu({
  user,
  roleLabel,
  copy,
  showSwitchOrganization,
}: {
  user: { name: string; email: string; preferredLocale?: string | null };
  roleLabel?: string | undefined;
  copy: DashboardCopy;
  showSwitchOrganization: boolean;
}) {
  return (
    <details className="group relative z-[110]">
      <summary
        className="zook-focus flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 text-sm text-white/72 transition hover:bg-white/8 hover:text-white [&::-webkit-details-marker]:hidden"
        aria-label={copy.common.account}
      >
        <UserCircle2 size={18} />
        <span className="hidden font-medium md:inline">{user.name}</span>
        <span className="hidden rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[11px] font-semibold text-white/55 lg:inline">
          {roleLabel ?? (user.preferredLocale === "hi" ? copy.common.hindi : copy.common.english)}
        </span>
      </summary>
      <div className="absolute right-0 z-[120] mt-2 w-[min(92vw,22rem)] rounded-[24px] border border-white/10 bg-zinc-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="rounded-2xl bg-white/[0.04] p-3">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="mt-1 truncate text-xs text-white/45">{user.email}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            {copy.common.language}
          </span>
          <DashboardLocaleToggle
            locale={user.preferredLocale ?? undefined}
            labels={{
              language: copy.common.language,
              english: copy.common.english,
              hindi: copy.common.hindi,
            }}
          />
        </div>
        {showSwitchOrganization ? (
          <Link
            href="/gyms"
            className="mt-3 block rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/65 transition hover:bg-white/8 hover:text-white"
          >
            {copy.common.switchOrganization}
          </Link>
        ) : null}
        <div className="my-3 h-px bg-white/10" />
        <DashboardSignOutButton label={copy.common.signOut} busyLabel={copy.common.signingOut} />
      </div>
    </details>
  );
}
