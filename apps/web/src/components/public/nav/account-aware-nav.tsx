"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthSessionSummary, Role } from "@zook/core";
import { ZookButtonLink } from "@/components/zook-button";
import {
  accountDestinationLabel,
  publicAccountDestination,
  type AuthDestination,
} from "@/lib/auth-destinations";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

type SessionPayload = AuthSessionSummary | null;

function dashboardOrigin() {
  return process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://dashboard.localhost:3000";
}

function destinationHref(destination: AuthDestination, locale: PublicLocale) {
  if (destination.host === "dashboard") {
    return new URL(destination.path, dashboardOrigin()).toString();
  }
  return localizedPath(destination.path, locale);
}

function sessionWithRoleFallback(session: SessionPayload) {
  if (!session || session.activeOrganization) {
    return session;
  }
  const activeOrganization = session.organizations?.find((organization) =>
    organization.roles.some((role: Role) =>
      ["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"].includes(role),
    ),
  );
  return activeOrganization ? { ...session, activeOrganization } : session;
}

export function AccountAwareNav({ locale }: { locale: PublicLocale }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionPayload>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/session", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!mounted) return;
        setSession(payload?.data ?? payload ?? null);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const destination = publicAccountDestination(sessionWithRoleFallback(session));
  const label = destination
    ? accountDestinationLabel(destination, {
        platform: "Platform",
        dashboard: publicT(locale, "dashboard"),
        desk: publicT(locale, "desk"),
        coach: publicT(locale, "coach"),
        membership: publicT(locale, "myMembership"),
      })
    : publicT(locale, "login");

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    window.location.assign(localizedPath("/", locale));
  }

  if (session) {
    const userName = session.user.name || "My account";
    const initials = userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "Z";

    return (
      <div className="relative">
        <button
          type="button"
          className="zook-focus inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-fill)] text-[11px] font-black text-[var(--text-on-accent)]">
            {initials}
          </span>
          <span className="hidden max-w-28 truncate sm:inline">{userName}</span>
          <ChevronDown size={14} aria-hidden />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
          >
            <div className="border-b border-[var(--border)] px-3 py-3">
              <p className="truncate font-semibold">{userName}</p>
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{session.user.email}</p>
              {session.user.phone ? (
                <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">{session.user.phone}</p>
              ) : null}
            </div>
            <div className="grid gap-1 p-1">
              <a
                role="menuitem"
                href={localizedPath("/me", locale)}
                className="zook-focus flex items-center gap-2 rounded-2xl px-3 py-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                <UserRound size={16} aria-hidden />
                My profile
              </a>
              {destination ? (
                <a
                  role="menuitem"
                  href={destinationHref(destination, locale)}
                  className="zook-focus rounded-2xl px-3 py-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                >
                  {label}
                </a>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={() => void signOut()}
                className="zook-focus flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden />
                {signingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ZookButtonLink
      href={destination ? destinationHref(destination, locale) : localizedPath("/login", locale)}
      tone="ghost"
      size="sm"
      aria-busy={!loaded}
    >
      {label}
    </ZookButtonLink>
  );
}
