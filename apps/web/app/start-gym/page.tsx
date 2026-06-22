import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { StartGymPanel } from "@/components/start-gym-panel";
import { ZookLogo } from "@/components/zook-logo";
import { publicT, resolvePublicLocale } from "@/lib/public-i18n";
import { publicSocialImage } from "@/lib/public-metadata";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export const metadata: Metadata = {
  title: "Start your gym | Zook",
  description: "Create a gym on Zook and continue into billing setup.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/start-gym" },
  openGraph: {
    title: "Start your gym on Zook",
    description: "Create a gym on Zook and continue into billing setup.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Start your gym on Zook" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Start your gym on Zook",
    description: "Create a gym on Zook and continue into billing setup.",
    images: [publicSocialImage()],
  },
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
  const locale = resolvePublicLocale(resolvedSearchParams);
  const tier = normalizeTier(resolvedSearchParams.tier);
  const switchAccountLabel = locale === "hi" ? "अकाउंट बदलें" : "Switch account";
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = await resolveSessionSummaryFromToken(token);

  if (!session) {
    const redirectTarget = new URLSearchParams();
    if (tier) {
      redirectTarget.set("tier", tier.toLowerCase());
    }
    if (locale === "hi") {
      redirectTarget.set("lang", "hi");
    }
    const redirectPath = `/start-gym${redirectTarget.size ? `?${redirectTarget.toString()}` : ""}`;
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
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
              {publicT(locale, "dashboard")}
            </Link>
            <DashboardSignOutButton compact label={switchAccountLabel} />
          </div>
        </header>
        <StartGymPanel {...(tier ? { initialTier: tier } : {})} ownerEmail={session.user.email} />
      </div>
    </main>
  );
}
