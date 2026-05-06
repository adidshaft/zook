import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GuardianConsentRedirectPage({
  searchParams,
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
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          You're verifying as a guardian for a minor member.
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/65">
          Open the full guardian consent link from the email, or request a fresh verification code
          from the minor member&apos;s profile in Zook.
        </p>
        <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left text-sm leading-6 text-white/65">
          {[
            "You confirm you are the minor member's legal guardian.",
            "You allow fitness program use and gym attendance features.",
            "You understand AI assistance is limited to age-safe coaching support.",
            "You can request data export or deletion through Zook privacy flows.",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              {item}
            </div>
          ))}
        </div>
        <Link
          href="/login?redirect=/guardian-consent"
          className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
        >
          Request a fresh code
        </Link>
      </section>
    </main>
  );
}
