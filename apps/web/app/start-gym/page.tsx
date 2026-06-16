import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { StartGymPanel } from "@/components/start-gym-panel";
import { ZookLogo } from "@/components/zook-logo";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export const metadata: Metadata = {
  title: "Start your gym | Zook",
  description: "Create a gym on Zook and continue into billing setup.",
  robots: { index: false, follow: false },
};

function normalizeTier(value?: string | string[]) {
  const tier = (Array.isArray(value) ? value[0] : value)?.trim().toUpperCase();
  return tier === "STARTER" || tier === "GROWTH" || tier === "PRO" ? tier : null;
}

export default async function StartGymPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tier = normalizeTier(resolvedSearchParams.tier);
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token);

  if (!session) {
    const redirectTarget = tier ? `/start-gym?tier=${tier.toLowerCase()}` : "/start-gym";
    redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  const ownerOrganization = session.organizations.find((organization) =>
    organization.roles.some((role) => role === "OWNER" || role === "ADMIN"),
  );
  if (ownerOrganization) {
    const billingParams = new URLSearchParams({
      created: ownerOrganization.orgId,
      setup: "billing",
    });
    if (tier) {
      billingParams.set("tier", tier.toLowerCase());
    }
    redirect(`/dashboard/billing?${billingParams.toString()}`);
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
        <StartGymPanel {...(tier ? { initialTier: tier } : {})} ownerEmail={session.user.email} />
      </div>
    </main>
  );
}
