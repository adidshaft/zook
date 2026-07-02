"use client";

import Link from "next/link";
import {
  Activity,
  Calendar,
  ClipboardList,
  Users,
} from "lucide-react";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { ActivityRow, KPITile } from "@/components/dashboard/charts";
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Trainer</p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Good day, {firstName}</h1>
        </div>
      </div>

      {clients.length > 0 ? (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Today
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                Coaching queue
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Open the client, assign the next plan, or capture progress from the app.
              </p>
            </div>
            <AppHandoffCard
              minimal
              title="Trainer app"
              description="Plan edits and progress logs stay fastest on mobile."
              deepLink={`zook://trainer/clients/${clients[0]!.id}`}
            />
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-3">
            {clients.slice(0, 3).map((client) => {
              const needsPlan = client.activePlans === 0;
              return (
                <Link
                  key={client.id}
                  href={`/coach/clients/${client.id}`}
                  className="zook-focus grid gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {client.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                        {client.goal || "General fitness"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        needsPlan
                          ? "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {needsPlan ? "Needs plan" : `${client.activePlans} active`}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-secondary)]">
                    {client.recentActivity}
                  </p>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      ) : null}

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

      {clients.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent clients</h2>
            <div className="mt-4 grid gap-2">
              {clients.slice(0, 4).map((client, index) => (
                <ActivityRow
                  key={client.id}
                  icon={Users}
                  iconTone={index === 0 ? "lime" : "sky"}
                  title={client.name}
                  subtitle={`${client.activePlans} active plan${client.activePlans === 1 ? "" : "s"} · ${client.recentActivity}`}
                  href={`/coach/clients/${client.id}`}
                  index={index}
                />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Open in app</h2>
            <div className="mt-4 grid gap-3">
              <AppHandoffCard
                minimal
                title="Assign plans in the app"
                description="Create, edit, and assign workout plans from the trainer mobile workspace."
                deepLink={`zook://trainer/clients/${clients[0]!.id}/plan`}
              />
              <AppHandoffCard
                minimal
                title="Log progress in the app"
                description="Capture weekly progress, PT notes, body comp, and reps in Zook mobile."
                deepLink={`zook://trainer/clients/${clients[0]!.id}/sessions`}
              />
            </div>
          </GlassCard>
        </section>
      ) : (
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Open in app</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AppHandoffCard
              minimal
              title="Assign plans in the app"
              description="Create, edit, and assign workout plans from the trainer mobile workspace."
              deepLink="zook://trainer/plans"
            />
            <AppHandoffCard
              minimal
              title="Log progress in the app"
              description="Capture weekly progress, PT notes, body comp, and reps in Zook mobile."
              deepLink="zook://trainer/pt"
            />
          </div>
        </GlassCard>
      )}

      <TrainerCustomisationPanel trainerName={firstName} />
    </>
  );
}
