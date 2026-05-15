import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { StartGymPanel } from "@/components/start-gym-panel";
import { ZookLogo } from "@/components/zook-logo";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export default async function StartGymPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token);

  if (!session) {
    redirect("/login?redirect=/start-gym");
  }

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ZookLogo />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              Dashboard
            </Link>
            <DashboardSignOutButton compact label="Switch account" />
          </div>
        </header>
        <StartGymPanel ownerEmail={session.user.email} />
      </div>
    </main>
  );
}
