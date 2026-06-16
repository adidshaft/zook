import { GuardianConsentRetiredPage } from "@/components/guardian-consent-retired-page";
import { resolvePublicLocale } from "@/lib/public-i18n";

export default async function GuardianConsentRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  return <GuardianConsentRetiredPage locale={locale} />;
}
