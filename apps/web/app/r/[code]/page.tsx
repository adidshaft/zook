import Link from "next/link";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

export default async function ReferralPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let username = "iron-house";
  try {
    const referral = await prisma.referralCode.findUnique({ where: { code } });
    const org = referral ? await prisma.organization.findUnique({ where: { id: referral.orgId } }) : null;
    if (org) username = org.username;
  } catch {}

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <GlassCard className="max-w-lg text-center">
        <Pill tone="amber">Referral {code}</Pill>
        <h1 className="mt-5 text-3xl font-semibold">Open Zook to join this gym</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Deep link target: zook://join/{username}?ref={code}
        </p>
        <Link href={`/join/${username}?ref=${code}`} className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">
          Continue
        </Link>
      </GlassCard>
    </main>
  );
}
