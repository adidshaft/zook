import type { Metadata } from "next";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { PublicFooter } from "@/components/public/footer";
import { AppCta } from "@/components/public/home/app-cta";
import { FeaturePillars } from "@/components/public/home/feature-pillars";
import { HomeBackdrop } from "@/components/public/home/home-backdrop";
import { HomeHero } from "@/components/public/home/hero";
import { IndiaOpsBand } from "@/components/public/home/india-ops-band";
import { OperationsLoop } from "@/components/public/home/operations-loop";
import { ProofStrip } from "@/components/public/home/proof-strip";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zook | Gym OS for modern gyms",
  description:
    "Run memberships, QR entry, trainer plans, desk operations, shop pickup, and owner reporting from one clean operating record.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Zook for modern gyms",
    description:
      "A clean operating system for memberships, QR entry, desk workflows, trainer plans, and gym growth.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zook for modern gyms",
    description:
      "A clean operating system for memberships, QR entry, desk workflows, trainer plans, and gym growth.",
  },
};

const iosAppUrl = process.env.NEXT_PUBLIC_IOS_APP_URL;
const androidAppUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);

  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="relative min-h-screen overflow-x-hidden px-5 py-5"
    >
      <HomeBackdrop />
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <PublicNav
          locale={locale}
          languageHref={localizedPath("/", nextLocale)}
          languageLabel={publicT(locale, "languageSwitch")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <HomeHero locale={locale} />
        <ProofStrip locale={locale} />
        <OperationsLoop locale={locale} />
        <FeaturePillars locale={locale} />
        <IndiaOpsBand locale={locale} />
        <AppCta locale={locale} iosAppUrl={iosAppUrl} androidAppUrl={androidAppUrl} />
        <PublicFooter locale={locale} />
      </div>
    </main>
  );
}
