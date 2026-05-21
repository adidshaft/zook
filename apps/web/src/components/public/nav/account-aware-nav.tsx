"use client";

import { useEffect, useState } from "react";
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
  const [session, setSession] = useState<SessionPayload>(null);
  const [loaded, setLoaded] = useState(false);

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
