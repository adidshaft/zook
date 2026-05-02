import Link from "next/link";
import { MapPin, Search, ShieldCheck } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr } from "@/lib/format";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";

export default async function GymPublicPage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicGymProfileData(username);

  if (!data) {
    return <main className="p-8">Gym not found.</main>;
  }
  const { org, plans, trainers } = data;
  const minPlanPrice = Math.min(...plans.map((plan) => plan.pricePaise));
  const defaultPlanId = plans[0]?.id;

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ZookLogo />
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45 md:flex">
              <Search size={16} />
              Search gyms, city, referral
            </div>
            <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
              Login
            </Link>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="glass-panel min-h-[560px] rounded-[32px] p-6 md:p-8">
            <Pill tone="lime">{org.joinMode.replaceAll("_", " ")}</Pill>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">{org.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-white/58">
              <MapPin size={18} /> {org.address} · {org.city}, {org.state}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/58">
              India-first gym operations powered by Zook: hosted checkout, QR entry, trainer plans, desk pickup, and member execution in one flow.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {org.amenities.map((amenity) => (
                <Pill key={amenity}>{amenity}</Pill>
              ))}
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {["Choose plan", "Verify email", "Pay securely"].map((step, index) => (
                <div key={step} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase text-white/35">Step {index + 1}</p>
                  <p className="mt-2 font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <GlassCard variant="strong" className="h-fit">
            <p className="text-sm text-white/45">Membership preview</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Plans from {formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/month</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Membership activates only after payment confirmation. Redirects alone are never trusted.
            </p>
            <Link href={`/join/${org.username}${defaultPlanId ? `?plan=${defaultPlanId}` : ""}`} className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">
              Join Now
            </Link>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-lime-200" size={22} />
                <p className="text-sm font-medium text-white">Server-authoritative activation</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">Hosted checkout returns to Zook, then the backend confirms payment before activation.</p>
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <GlassCard key={plan.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Pill tone={plan.id === "plan-hybrid-pro" ? "lime" : "neutral"}>{plan.type.replaceAll("_", " ")}</Pill>
                  <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
                </div>
                <p className="metric text-2xl font-semibold text-lime-200">{formatInr(plan.pricePaise)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/52">{plan.description}</p>
              <p className="mt-4 text-sm text-white/45">{plan.durationDays} days · {plan.visitLimit || "Unlimited"} visits</p>
              <Link href={`/join/${org.username}?plan=${plan.id}`} className="zook-focus mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/8">
                Select plan
              </Link>
            </GlassCard>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Visible trainers</h2>
            <div className="mt-5 grid gap-3">
              {trainers.map((trainer) => (
                <div key={trainer.userId} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white">{trainer.name}</p>
                  <p className="mt-1 text-sm text-white/45">{trainer.bio ?? "Strength coaching · plan review · PT support"}</p>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Referral</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">Have a referral or invite code? Apply it during checkout so the gym can track the source and any eligible discount.</p>
            <Link href={`/join/${org.username}${defaultPlanId ? `?plan=${defaultPlanId}` : ""}`} className="zook-focus mt-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
              Review membership
            </Link>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
