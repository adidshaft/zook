import Link from "next/link";
import { notFound } from "next/navigation";
import { zookDemoFixtures } from "@zook/core";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

async function referralUsername(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  try {
    const referral = await prisma.referralCode.findUnique({ where: { code: normalizedCode } });
    if (!referral || referral.status !== "active") {
      return null;
    }
    const org = await prisma.organization.findUnique({ where: { id: referral.orgId } });
    return org && org.visibility !== "HIDDEN" ? org.username : null;
  } catch (error) {
    if (!canUsePublicDemoFallback()) {
      throw error;
    }
  }

  const referral = zookDemoFixtures.referralCodes.find(
    (candidate) => candidate.code.toUpperCase() === normalizedCode && candidate.status === "active",
  );
  const org = referral
    ? zookDemoFixtures.organizations.find((candidate) => candidate.id === referral.orgId)
    : null;
  return org?.username ?? null;
}

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const username = await referralUsername(normalizedCode);
  if (!username) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <GlassCard className="max-w-lg text-center">
        <Pill tone="amber">Referral {normalizedCode}</Pill>
        <h1 className="mt-5 text-3xl font-semibold">Open Zook to join this gym</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Continue to the gym membership page. Your referral code will be applied there.
        </p>
        <Link
          href={`/join/${username}?ref=${normalizedCode}`}
          className="mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
        >
          Continue
        </Link>
      </GlassCard>
    </main>
  );
}
