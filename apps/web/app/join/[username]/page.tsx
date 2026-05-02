import Link from "next/link";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr } from "@/lib/format";
import { getPublicGymProfileData, type PublicGymReferral } from "@/server/public-gym-read-models";

function discountFor(referral: PublicGymReferral | null, planPricePaise: number) {
  if (!referral || referral.status !== "active") {
    return 0;
  }
  if (referral.discountPaise > 0) {
    return referral.discountPaise;
  }
  if (referral.discountPercentBps) {
    return Math.floor((planPricePaise * referral.discountPercentBps) / 10_000);
  }
  return 0;
}

export default async function JoinPage({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ plan?: string; ref?: string; mode?: string }>;
}) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const data = await getPublicGymProfileData(username, query.ref);
  const org = data?.org;
  const selectedPlan = data?.plans.find((plan) => plan.id === query.plan) ?? data?.plans[0];
  const referral = data?.referral ?? null;
  const discountPaise = discountFor(referral, selectedPlan?.pricePaise ?? 0);
  const finalAmount = Math.max(0, (selectedPlan?.pricePaise ?? 0) - discountPaise);
  const joinMode = query.mode ?? org?.joinMode ?? "OPEN_JOIN";

  if (!org || !selectedPlan) {
    return <main className="p-8">Join flow unavailable.</main>;
  }

  if (joinMode === "APPROVAL_REQUIRED") {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <div className="absolute left-5 top-5"><ZookLogo /></div>
        <GlassCard className="max-w-xl">
          <Pill tone="amber">Approval required</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">Join request submitted</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            The owner/admin approves the request first. Once approved, Zook creates a checkout link and sends an in-app notification.
          </p>
          <Link href={`/g/${org.username}`} className="zook-focus mt-6 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm text-white/70">
            Back to gym
          </Link>
        </GlassCard>
      </main>
    );
  }

  if (joinMode === "INVITE_ONLY" && !referral) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <div className="absolute left-5 top-5"><ZookLogo /></div>
        <GlassCard className="max-w-xl">
          <Pill tone="red">Invite only</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">Invite code required</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            This gym requires a valid referral or invite code before checkout can start.
          </p>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <Link href={`/g/${org.username}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
            Gym profile
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <GlassCard variant="strong">
            <Pill tone="lime">Hosted checkout handoff</Pill>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">Review your membership</h1>
            <div className="mt-6 grid gap-3">
              <Readout label="Gym" value={`${org.name} · ${org.city}`} />
              <Readout label="Plan" value={selectedPlan.name} />
              <Readout label="Validity" value={`${selectedPlan.durationDays} days`} />
              <Readout label="Visits" value={`${selectedPlan.visitLimit || 12} visits`} />
              <Readout label="Referral applied" value={referral ? `-${formatInr(discountPaise)} (${referral.code})` : "None"} />
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-sm text-white/45">Final amount</p>
            <p className="metric mt-2 text-5xl font-semibold text-lime-200">{formatInr(finalAmount)}</p>
            <div className="mt-6 grid gap-3">
              {["Secure hosted checkout", "Backend confirms payment", "Membership activates automatically"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <CheckCircle2 className="text-lime-200" size={20} />
                  <p className="text-sm text-white/75">{index + 1}. {step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[22px] border border-amber-300/20 bg-amber-300/10 p-4">
              <div className="flex items-center gap-3">
                <LockKeyhole className="text-amber-100" size={20} />
                <p className="text-sm font-medium text-amber-50">Your membership activates only after payment confirmation.</p>
              </div>
            </div>
            {data.connected ? (
              <Link
                href="/login"
                className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                Sign in to continue
              </Link>
            ) : (
              <Link
                href={`/checkout/mock/demo?plan=${selectedPlan.id}${referral ? `&ref=${referral.code}` : ""}`}
                className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                Continue to Demo Checkout
              </Link>
            )}
          </GlassCard>
        </section>
      </div>
    </main>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase text-white/35">{label}</p>
      <p className="mt-2 font-medium text-white">{value}</p>
    </div>
  );
}
