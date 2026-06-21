"use client";

import {
  Activity,
  Calendar,
  ClipboardList,
  Dumbbell,
  PinIcon,
  Users,
} from "lucide-react";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { ActivityRow, KPITile, SectionHero } from "@/components/dashboard/charts";
import { GlassCard } from "@/components/glass-card";
import { TrainerCustomisationPanel } from "@/components/trainer-customisation-panel";

type CoachStats = {
  assignedClients: number;
  plansAssigned: number;
  sessionsThisWeek: number;
  progressNotes: number;
};

type CoachClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  profilePhotoUrl: string | null;
  activePlans: number;
  recentActivity: string;
};

export function CoachPage({
  firstName,
  stats,
  clients,
}: {
  firstName: string;
  stats: CoachStats;
  clients: CoachClient[];
}) {
  return (
    <>
      <SectionHero
        eyebrow={`Good day, ${firstName}`}
        title="Trainer command"
        description="Your assigned clients, week schedule, and progress notes are in the Zook app. This web view highlights active work."
        icon={Dumbbell}
        tone="sky"
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPITile
          label="Assigned clients"
          value={stats.assignedClients}
          icon={Users}
          tone="sky"
        />
        <KPITile
          label="Plans assigned"
          value={stats.plansAssigned}
          icon={ClipboardList}
          tone="sky"
        />
        <KPITile
          label="Sessions this week"
          value={stats.sessionsThisWeek}
          icon={Calendar}
          tone="sky"
        />
        <KPITile
          label="Progress notes"
          value={stats.progressNotes}
          icon={Activity}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Pinned for today</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {clients.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                <PinIcon size={16} className="mt-0.5 shrink-0 text-[var(--text-tertiary)]" />
                <span>
                  No pinned clients. Pin clients in the mobile app.
                </span>
              </div>
            ) : (
              clients.slice(0, 4).map((client, index) => (
                <ActivityRow
                  key={client.id}
                  icon={Users}
                  iconTone={index === 0 ? "lime" : "sky"}
                  title={client.name}
                  subtitle={`${client.activePlans} active plan${client.activePlans === 1 ? "" : "s"} · ${client.recentActivity}`}
                  href={`/coach/clients/${client.id}`}
                  index={index}
                />
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Today</h2>
          <div className="mt-4 grid gap-3">
            <AppHandoffCard
              compact
              title="Assign plans in the app"
              description="Create, edit, and assign workout plans from the trainer mobile workspace."
              deepLink={clients[0] ? `zook://trainer/clients/${clients[0].id}/plan` : "zook://trainer/plans"}
            />
            <AppHandoffCard
              compact
              title="Log progress in the app"
              description="Capture weekly progress, PT notes, body comp, and reps in Zook mobile."
              deepLink={clients[0] ? `zook://trainer/clients/${clients[0].id}/sessions` : "zook://trainer/pt"}
            />
          </div>
        </GlassCard>
      </section>

      <TrainerCustomisationPanel trainerName={firstName} />
    </>
  );
}
