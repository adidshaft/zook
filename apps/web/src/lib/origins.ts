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
    ? "https://dashboard.zookfit.in"
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

export function getOrigins(): WebOrigins {
  return {
    public: normalizeOrigin(process.env.NEXT_PUBLIC_WEB_URL, defaultPublicOrigin()),
    dashboard: normalizeOrigin(process.env.NEXT_PUBLIC_DASHBOARD_URL, defaultDashboardOrigin()),
  };
}

export function webHostFromHeader(
  host: string | null | undefined,
  origins = getOrigins(),
): WebHost {
  const hostname = host?.split(":")[0]?.trim().toLowerCase() ?? "";
  const dashboardHostname = new URL(origins.dashboard).hostname.toLowerCase();

  if (hostname === dashboardHostname || hostname.startsWith("dashboard.")) {
    return "dashboard";
  }
  return "public";
}
