"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  Dumbbell,
  PinIcon,
  Smartphone,
  Users,
} from "lucide-react";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { ActivityRow, KPITile, PulseDot, SectionHero } from "@/components/dashboard/charts";
import { GlassCard, Pill } from "@/components/glass-card";
import { TrainerCustomisationPanel } from "@/components/trainer-customisation-panel";

type CoachStats = {
  assignedClients: number;
  plansAssigned: number;
  sessionsThisWeek: number;
  progressNotes: number;
};

export function CoachCommandPanel({
  firstName,
  stats,
}: {
  firstName: string;
  stats: CoachStats;
}) {
  return (
    <main className="relative min-h-dvh px-5 py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-lime-300/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-sky-300/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-white/70">
            Zook
          </Link>
          <DashboardSignOutButton compact />
        </header>

        <SectionHero
          eyebrow={`Good day, ${firstName}`}
          title="Trainer command"
          description="Your assigned clients, week schedule, and progress notes live in the Zook app. The web view gives you a quick read on what's active right now."
          icon={Dumbbell}
          tone="lime"
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-medium text-lime-100">
                <PulseDot tone="lime" size={6} />
                Live signal
              </span>
              <Pill tone="lime">Trainer</Pill>
            </div>
          }
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPITile
            label="Assigned clients"
            value={stats.assignedClients}
            icon={Users}
            tone="lime"
            caption="Active on your roster"
          />
          <KPITile
            label="Plans assigned"
            value={stats.plansAssigned}
            icon={ClipboardList}
            tone="sky"
            caption="Live programs"
          />
          <KPITile
            label="Sessions this week"
            value={stats.sessionsThisWeek}
            icon={Calendar}
            tone="amber"
            caption="Logged on the app"
          />
          <KPITile
            label="Progress notes"
            value={stats.progressNotes}
            icon={Activity}
            tone="violet"
            caption="Last 30 days"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Pinned for today</h2>
              <Link
                href="/me"
                className="text-xs font-medium text-lime-300 hover:underline"
              >
                Open my profile {"->"}
              </Link>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Use the Zook mobile app to pin a client here and pull up their plan with one tap from
              the dashboard.
            </p>
            <div className="mt-4 grid gap-2">
              {stats.assignedClients === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm text-white/55">
                  <PinIcon size={16} className="mt-0.5 shrink-0 text-white/35" />
                  <span>
                    No clients pinned yet. Pin from the mobile app and they appear here
                    automatically.
                  </span>
                </div>
              ) : (
                <ActivityRow
                  icon={Users}
                  iconTone="lime"
                  title="Pinned clients will appear here"
                  subtitle="One-tap access"
                />
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Today's quick actions</h2>
            </div>
            <div className="mt-4 grid gap-2">
              <ActivityRow
                icon={ClipboardList}
                iconTone="lime"
                title="Assign a new plan"
                subtitle="Open the assigned-plans builder in the app"
                href="/me"
                index={0}
              />
              <ActivityRow
                icon={Bell}
                iconTone="sky"
                title="Notify a member"
                subtitle="Send a quick check-in nudge"
                href="/me"
                index={1}
              />
              <ActivityRow
                icon={BarChart3}
                iconTone="amber"
                title="Log this week's progress"
                subtitle="Capture weights, reps, body comp"
                href="/me"
                index={2}
              />
              <ActivityRow
                icon={Smartphone}
                iconTone="violet"
                title="Open in the Zook app"
                subtitle="Full coaching surface lives on mobile"
                href="/me"
                index={3}
              />
            </div>
          </GlassCard>
        </section>

        <TrainerCustomisationPanel trainerName={firstName} />
      </div>
    </main>
  );
}
