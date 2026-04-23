import Link from "next/link";
import { QrCode } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

export default async function JoinPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <GlassCard className="max-w-lg text-center">
        <QrCode className="mx-auto text-lime-200" size={48} />
        <Pill tone="lime">zook://join/{username}</Pill>
        <h1 className="mt-5 text-3xl font-semibold">Open Zook to join {username}</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Referral and coupon context is preserved for the app. Web fallback supports mock checkout during local development.
        </p>
        {query.ref ? <p className="mt-4 text-sm text-amber-100">Referral code: {query.ref}</p> : null}
        <Link href={`/g/${username}`} className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">
          View gym profile
        </Link>
      </GlassCard>
    </main>
  );
}
