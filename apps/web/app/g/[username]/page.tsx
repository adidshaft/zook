import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { demoGyms } from "@zook/core";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr } from "@/lib/format";

export default async function GymPublicPage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let org = demoGyms.find((gym) => gym.username === username);
  let plans: Array<{ id: string; name: string; pricePaise: number; description: string | null }> = [
    { id: "monthly", name: "Monthly Unlimited", pricePaise: 199900, description: "30 days access" },
    { id: "visits", name: "30 Visits / 180 Days", pricePaise: 349900, description: "Flexible visit pack" }
  ];
  try {
    const dbOrg = await prisma.organization.findUnique({ where: { username } });
    if (dbOrg) {
      org = {
        id: dbOrg.id,
        name: dbOrg.name,
        username: dbOrg.username,
        city: dbOrg.city,
        state: dbOrg.state,
        visibility: dbOrg.visibility,
        joinMode: dbOrg.joinMode,
        latitude: Number(dbOrg.latitude ?? 0),
        longitude: Number(dbOrg.longitude ?? 0),
        amenities: Array.isArray(dbOrg.amenities) ? (dbOrg.amenities as string[]) : []
      };
      plans = await prisma.membershipPlan.findMany({
        where: { orgId: dbOrg.id, active: true, publicVisible: true },
        take: 4
      });
    }
  } catch {
    // Database is optional for static preview; seeded demo data remains available.
  }

  if (!org) {
    return <main className="p-8">Gym not found.</main>;
  }

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
            Open Zook
          </Link>
        </header>
        <section className="glass-panel grid gap-6 rounded-[32px] p-6 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <Pill tone="lime">{org.joinMode.replaceAll("_", " ")}</Pill>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight">{org.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-white/55">
              <MapPin size={18} /> {org.city}, {org.state}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {org.amenities.map((amenity) => (
                <Pill key={amenity}>{amenity}</Pill>
              ))}
            </div>
            <Link href={`/join/${org.username}`} className="mt-8 inline-flex rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">
              Join or request membership
            </Link>
          </div>
          <div className="grid min-h-[320px] place-items-center rounded-[28px] border border-white/10 bg-black/30">
            <div className="text-center">
              <Sparkles className="mx-auto text-amber-100" size={44} />
              <p className="mt-4 text-lg font-semibold">Map/list discovery ready</p>
              <p className="mt-2 text-sm text-white/45">Mock maps work without API keys.</p>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <GlassCard key={plan.id}>
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-sm text-white/45">{plan.description}</p>
              <p className="metric mt-5 text-3xl font-semibold">{formatInr(plan.pricePaise)}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </main>
  );
}
