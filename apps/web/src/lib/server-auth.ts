import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { WebHost } from "./host-routing";
import { getOrigins, webHostFromHeader } from "./origins";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export async function requireDashboardSession(
  opts: {
    expectedHost?: WebHost;
    redirectPath?: string;
    loginRedirectPath?: string;
    preferredOrgId?: string | undefined;
  } = {},
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token, opts.preferredOrgId);

  if (!session) {
    let loginPath = "/login";
    if (opts.loginRedirectPath) {
      const query = new URLSearchParams({ redirect: opts.loginRedirectPath });
      const locale = new URL(opts.loginRedirectPath, "https://zook.local").searchParams.get("lang");
      if (locale === "hi") {
        query.set("lang", locale);
      }
      loginPath = `/login?${query.toString()}`;
    }
    if (opts.expectedHost === "dashboard") {
      redirect(new URL(loginPath, getOrigins().dashboard).toString());
    }
    redirect(loginPath);
  }

  if (opts.expectedHost) {
    const origins = getOrigins();
    const currentHost = webHostFromHeader((await headers()).get("host"), origins);
    if (currentHost !== opts.expectedHost) {
      const origin = opts.expectedHost === "dashboard" ? origins.dashboard : origins.public;
      redirect(new URL(opts.redirectPath ?? "/", origin).toString());
    }
  }

  return session;
}

export async function requirePlatformSession() {
  const session = await requireDashboardSession();
  if (!session.user.isPlatformAdmin) {
    redirect("/dashboard");
  }
  return session;
}
