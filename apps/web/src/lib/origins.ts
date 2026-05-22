import type { WebHost } from "./host-routing";

export type WebOrigins = {
  public: string;
  dashboard: string;
};

function defaultPublicOrigin() {
  return process.env.NODE_ENV === "production" ? "https://zookfit.in" : "http://localhost:3000";
}

function defaultDashboardOrigin() {
  return process.env.NODE_ENV === "production"
    ? "https://app.zookfit.in"
    : "http://dashboard.localhost:3000";
}

function normalizeOrigin(value: string | undefined, fallback: string) {
  const origin = value?.trim() || fallback;
  try {
    return new URL(origin).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function getOrigins(): WebOrigins {
  const configuredPublicOrigin = process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const publicOrigin = normalizeOrigin(
    configuredPublicOrigin,
    defaultPublicOrigin(),
  );
  const dashboardFallback =
    configuredPublicOrigin?.trim() &&
    !process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() &&
    isLocalOrigin(publicOrigin)
      ? publicOrigin
      : defaultDashboardOrigin();

  return {
    public: publicOrigin,
    dashboard: normalizeOrigin(process.env.NEXT_PUBLIC_DASHBOARD_URL, dashboardFallback),
  };
}

export function webHostFromHeader(
  host: string | null | undefined,
  origins = getOrigins(),
): WebHost {
  const hostname = host?.split(":")[0]?.trim().toLowerCase() ?? "";
  const dashboardHostname = new URL(origins.dashboard).hostname.toLowerCase();

  if (hostname === dashboardHostname || hostname === "dashboard.zookfit.in" || hostname.startsWith("dashboard.")) {
    return "dashboard";
  }
  return "public";
}
