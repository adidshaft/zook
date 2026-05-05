import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

export default async function GymsPage() {
  const gyms = await prisma.organization.findMany({
    where: { status: { not: "CANCELLED" }, visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return (
    <main className="min-h-dvh px-5 py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <ZookLogo />
        <Link href="/" className="text-sm font-medium text-white/55 transition hover:text-white">
          Home
        </Link>
      </div>

      <section className="mx-auto mt-12 w-full max-w-6xl">
        <Pill tone="lime">Gym discovery</Pill>
        <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-white">
          Find a Zook gym.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
          Browse public gyms, open their member page, and pick a membership plan when you are ready.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gyms.map((gym) => (
            <GlassCard key={gym.id}>
              <div className="flex min-h-[220px] flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{gym.name}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-white/55">
                      <MapPin size={16} />
                      {gym.city}, {gym.state}
                    </p>
                  </div>
                  <Pill tone={gym.joinMode === "OPEN_JOIN" ? "lime" : "amber"}>
                    {gym.joinMode.replace(/_/g, " ").toLowerCase()}
                  </Pill>
                </div>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-white/55">
                  Memberships, QR entry, trainers, and desk workflows on Zook.
                </p>
                <div className="mt-auto pt-6">
                  <Link
                    href={`/g/${gym.username}`}
                    className="zook-focus inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
                  >
                    Open gym
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {!gyms.length ? (
          <GlassCard className="mt-8">
            <h2 className="text-2xl font-semibold text-white">No public gyms yet</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Public gym profiles will appear here as owners publish them.
            </p>
          </GlassCard>
        ) : null}
      </section>
    </main>
  );
}
