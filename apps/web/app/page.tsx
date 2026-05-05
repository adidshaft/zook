import Link from "next/link";
import { ArrowRight, Bell, QrCode, Smartphone, Store, Users, type LucideIcon } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

export default function HomePage() {
  const featureCards: Array<[LucideIcon, string, string]> = [
    [Users, "Owners", "Control room"],
    [Smartphone, "Members", "Daily app"],
    [Bell, "Staff", "Desk and coaching"],
  ];

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="grid min-h-[74vh] items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Pill tone="lime">India-first Gym OS</Pill>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              The operating system for modern gyms.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/58">
              Manage memberships, rolling QR entry, trainer plans, reception approvals, shop pickup,
              and provider readiness from one operating system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                Sign in to Dashboard
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login?redirect=/start-gym"
                className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3 text-white/75"
              >
                Start a gym
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/45">Owner dashboard</p>
                  <h2 className="mt-1 text-3xl font-semibold">Run gym operations from web.</h2>
                </div>
                <QrCode className="text-lime-200" />
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <Store className="text-amber-100" />
                  <p className="mt-4 text-sm text-white/45">Sell memberships and shop items</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <QrCode className="text-lime-200" />
                  <p className="mt-4 text-sm text-white/45">Publish join links and QR codes</p>
                </div>
              </div>
            </GlassCard>
            <div className="grid gap-4 md:grid-cols-3">
              {featureCards.map(([Icon, label, value]) => (
                <GlassCard key={String(label)}>
                  <Icon className="text-amber-100" />
                  <p className="mt-4 text-sm text-white/45">{String(label)}</p>
                  <p className="mt-1 font-semibold">{String(value)}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
