import Link from "next/link";
import { UserCircle2 } from "lucide-react";
import { DashboardLocaleToggle } from "../../dashboard-locale-toggle";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { ThemePreferenceSwitcher } from "../../theme-preference-switcher";
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
    <details className="group relative z-[110]" data-testid="dashboard-user-menu">
      <summary
        className="zook-focus flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden"
        aria-label={copy.common.account}
      >
        <UserCircle2 size={18} />
        <span className="hidden font-medium md:inline">{user.name}</span>
        <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-tertiary)] lg:inline">
          {roleLabel ?? (user.preferredLocale === "hi" ? copy.common.hindi : copy.common.english)}
        </span>
      </summary>
      <div className="absolute right-0 z-[120] mt-2 w-[min(92vw,24rem)] rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-lg)]">
        <div className="rounded-2xl bg-[var(--bg-sunken)] p-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">{user.email}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
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
        <div className="mt-3 space-y-2 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Theme
          </span>
          <ThemePreferenceSwitcher />
        </div>
        {showSwitchOrganization ? (
          <Link
            href="/gyms"
            className="mt-3 block rounded-2xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
          >
            {copy.common.switchOrganization}
          </Link>
        ) : null}
        <div className="my-3 h-px bg-[var(--border-subtle)]" />
        <DashboardSignOutButton label={copy.common.signOut} busyLabel={copy.common.signingOut} />
      </div>
    </details>
  );
}
