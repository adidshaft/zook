import { redirect } from "next/navigation";

export default async function GuardianConsentRedirectPage({
  searchParams
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const resolved = await searchParams;
  const challengeId = resolved.challenge?.trim();

  if (challengeId) {
    redirect(`/guardian/consent/${challengeId}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <section className="glass-panel w-full rounded-[32px] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-white/45">Zook Guardian Consent</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Consent link unavailable</h1>
        <p className="mt-4 text-sm leading-7 text-white/65">
          Open the full guardian consent link from the email, or request a fresh guardian OTP from the minor member&apos;s profile in Zook.
        </p>
      </section>
    </main>
  );
}
