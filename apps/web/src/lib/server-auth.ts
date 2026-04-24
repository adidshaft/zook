import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export async function requireDashboardSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token);

  if (!session) {
    redirect("/login");
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
