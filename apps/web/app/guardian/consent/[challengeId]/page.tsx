import type { Metadata } from "next";
import { GuardianConsentRetiredPage } from "@/components/guardian-consent-retired-page";
import { resolvePublicLocale } from "@/lib/public-i18n";

export const metadata: Metadata = {
  title: "Guardian consent | Zook",
  description: "Private guardian consent status for a Zook member account.",
  robots: { index: false, follow: false },
};

export default async function GuardianConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ challengeId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { challengeId } = await params;
  const locale = resolvePublicLocale((await searchParams) ?? {});
  return <GuardianConsentRetiredPage challengeId={challengeId} locale={locale} />;
}
