"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { UserCircle2 } from "lucide-react";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { ThemePreferenceSwitcher } from "../../theme-preference-switcher";
import type { UserMenuCopy } from "./types";

export function UserMenu({
  user,
  roleLabel,
  copy,
  showSwitchOrganization,
}: {
  user: { name: string; email: string; preferredLocale?: string | null };
  roleLabel?: string | undefined;
  copy: UserMenuCopy;
  showSwitchOrganization: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        detailsRef.current &&
        detailsRef.current.open &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <details
      ref={detailsRef}
      className="group relative z-[var(--z-dropdown)]"
      data-testid="dashboard-user-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector("summary")?.focus();
        }
      }}
    >
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
      <div className="absolute right-0 z-[var(--z-modal)] mt-2 w-[min(92vw,24rem)] rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-lg)]">
        <div className="rounded-2xl bg-[var(--bg-sunken)] p-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">{user.email}</p>
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
