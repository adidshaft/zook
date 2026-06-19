"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import type { Permission } from "@zook/core";
import { DashboardPageShell, SectionHeader, StatusPill } from "@/components/dashboard-primitives/layout";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import type { BranchScopeSnapshot, ClassRow } from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { useClasses } from "@/lib/query-hooks/classes";

type TrainerOption = {
  id: string;
  name: string;
};

type ClassesDashboardRouteProps = {
  orgId: string;
  branchScope: BranchScopeSnapshot;
  trainerOptions: TrainerOption[];
  currentUserId?: string;
  permissions: Permission[];
};

function toDateTimeLocalValue(value: Date) {
  const adjusted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function defaultClassForm(trainerId?: string) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    name: "",
    classType: "GROUP",
    description: "",
    trainerId: trainerId ?? "",
    maxCapacity: "12",
    startTime: toDateTimeLocalValue(start),
    endTime: toDateTimeLocalValue(end),
  };
}

function classStatusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "scheduled") return "lime" as const;
  if (value === "cancelled") return "red" as const;
  if (value === "completed") return "blue" as const;
  return "neutral" as const;
}

export function ClassesDashboardRoute({
  orgId,
  branchScope,
  trainerOptions,
  currentUserId,
  permissions,
}: ClassesDashboardRouteProps) {
  const queryClient = useQueryClient();
  const selectedBranchId = branchScope.allBranches ? null : branchScope.selectedBranch?.id ?? null;
  const selectedBranchName = branchScope.allBranches
    ? "All branches"
    : branchScope.selectedBranch?.name ?? "Select a branch";
  const canManageAllTrainers = permissions.includes("TRAINERS_MANAGE");
  const defaultTrainerId =
    (canManageAllTrainers ? trainerOptions[0]?.id : currentUserId) ?? trainerOptions[0]?.id ?? "";
  const [form, setForm] = useState(() => defaultClassForm(defaultTrainerId));
  const classesQuery = useClasses(orgId, selectedBranchId);
  const classes = classesQuery.data?.classes ?? [];
  const createClassMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) {
        throw new Error("Choose one branch before scheduling a class.");
      }
      return webApiFetch<{ class: ClassRow }>(`/api/orgs/${orgId}/classes`, {
        method: "POST",
        body: {
          branchId: selectedBranchId,
          trainerId: canManageAllTrainers ? form.trainerId : currentUserId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          classType: form.classType.trim(),
          maxCapacity: Number(form.maxCapacity),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        },
        feedback: { success: "Class scheduled." },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classes", orgId, selectedBranchId ?? "all"],
      });
      setForm(defaultClassForm(canManageAllTrainers ? form.trainerId : currentUserId));
    },
  });
  const trainerChoices = useMemo(
    () =>
      canManageAllTrainers
        ? trainerOptions
        : trainerOptions.filter((trainer) => trainer.id === currentUserId),
    [canManageAllTrainers, currentUserId, trainerOptions],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <DashboardPageShell
        eyebrow="Classes"
        title="Schedule a group class"
        description="Create the next yoga, strength, spin, or PT-led session for the active branch."
        action={
          <Pill tone={selectedBranchId ? "blue" : "amber"}>
            <MapPin className="h-3.5 w-3.5" />
            {selectedBranchName}
          </Pill>
        }
      >
        <div className="grid gap-3">
          {!selectedBranchId ? (
            <GlassCard variant="warning">
              <p className="text-sm leading-6 text-[var(--text-primary)]">
                Pick one branch from the header before creating a class. The schedule stays branch-scoped.
              </p>
            </GlassCard>
          ) : null}
          {!trainerChoices.length ? (
            <GlassCard variant="warning">
              <p className="text-sm leading-6 text-[var(--text-primary)]">
                Add at least one trainer in Staff before scheduling classes.
              </p>
            </GlassCard>
          ) : null}
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Class name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Morning yoga"
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Class type
              <input
                value={form.classType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, classType: event.target.value }))
                }
                placeholder="Yoga"
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Capacity
              <input
                type="number"
                min={1}
                value={form.maxCapacity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxCapacity: event.target.value }))
                }
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Starts
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startTime: event.target.value }))
                }
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Ends
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endTime: event.target.value }))
                }
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Trainer
            <select
              value={canManageAllTrainers ? form.trainerId : currentUserId ?? trainerChoices[0]?.id ?? ""}
              disabled={!canManageAllTrainers}
              onChange={(event) =>
                setForm((current) => ({ ...current, trainerId: event.target.value }))
              }
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)] disabled:opacity-70"
            >
              {trainerChoices.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Notes
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={4}
              placeholder="Focus, equipment, or who the class is for."
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <ZookButton
            onClick={() => createClassMutation.mutate()}
            disabled={
              createClassMutation.isPending ||
              !selectedBranchId ||
              !trainerChoices.length ||
              !form.name.trim() ||
              !(canManageAllTrainers ? form.trainerId : currentUserId)
            }
            state={createClassMutation.isPending ? "loading" : "idle"}
            fullWidth
          >
            Schedule class
          </ZookButton>
        </div>
      </DashboardPageShell>

      <GlassCard variant="strong">
        <SectionHeader
          eyebrow="Upcoming"
          title="Scheduled classes"
          description="The list updates for the selected branch and shows confirmed capacity."
          badge={
            <Pill>
              <CalendarDays className="h-3.5 w-3.5" />
              {classes.length} scheduled
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {classesQuery.isLoading ? (
            <GlassCard variant="muted">
              <p className="text-sm text-[var(--text-secondary)]">Loading upcoming classes.</p>
            </GlassCard>
          ) : null}
          {classesQuery.isError ? (
            <GlassCard variant="danger">
              <p className="text-sm text-[var(--text-primary)]">
                {(classesQuery.error as Error).message || "Classes could not load."}
              </p>
            </GlassCard>
          ) : null}
          {!classesQuery.isLoading && !classes.length ? (
            <GlassCard variant="muted">
              <p className="text-sm text-[var(--text-secondary)]">
                No upcoming classes yet for this branch.
              </p>
            </GlassCard>
          ) : null}
          {classes.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {entry.name}
                    </h3>
                    <Pill tone="neutral">{formatEnumLabel(entry.classType)}</Pill>
                    <StatusPill value={entry.status} tone={classStatusTone(entry.status)} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {formatDateTime(entry.startTime)} to {formatDateTime(entry.endTime)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Pill>
                    <Users className="h-3.5 w-3.5" />
                    {entry.enrollmentCount}/{entry.maxCapacity}
                  </Pill>
                  <Pill tone="neutral">
                    <UserRound className="h-3.5 w-3.5" />
                    {entry.trainerName ?? "Trainer pending"}
                  </Pill>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                <p>
                  Branch:{" "}
                  <span className="text-[var(--text-primary)]">
                    {entry.branchName ?? selectedBranchName}
                  </span>
                </p>
                <p>
                  Remaining spots:{" "}
                  <span className="text-[var(--text-primary)]">{entry.remainingCapacity}</span>
                </p>
              </div>
              {entry.description ? (
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                  {entry.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
