import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { WebHost } from "./host-routing";
import { getOrigins, webHostFromHeader } from "./origins";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export async function requireDashboardSession(
  opts: { expectedHost?: WebHost; redirectPath?: string } = {},
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token);

  if (!session) {
    if (opts.expectedHost === "dashboard") {
      redirect(`${getOrigins().dashboard}/login`);
    }
    redirect("/login");
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
