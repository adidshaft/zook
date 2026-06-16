import { GuardianConsentRetiredPage } from "@/components/guardian-consent-retired-page";

export default async function GuardianConsentPage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  return <GuardianConsentRetiredPage challengeId={challengeId} />;
}
