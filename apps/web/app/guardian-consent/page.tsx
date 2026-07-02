import type { Metadata } from "next";
import { GuardianConsentRetiredPage } from "@/components/guardian-consent-retired-page";
import { resolvePublicLocale } from "@/lib/public-i18n";

export const metadata: Metadata = {
  title: "Guardian consent retired | Zook",
  description: "This guardian consent flow has moved to the current Zook app flow.",
  robots: { index: false, follow: false },
};

export default async function GuardianConsentRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  return <GuardianConsentRetiredPage locale={locale} />;
}
