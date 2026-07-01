"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, IndianRupee, UserRound, Users } from "lucide-react";
import type { Permission } from "@zook/core";
import {
  DashboardPageShell,
  SectionHeader,
  StatusPill,
} from "@/components/dashboard-primitives/layout";
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

type ClassRosterRow = {
  memberId: string;
  name: string;
  status: string;
  paymentStatus?: string | null;
  paidAt?: string | null;
  enrolledAt: string;
};

type ClassRosterState = {
  loading: boolean;
  error: string;
  roster: ClassRosterRow[];
};

type ClassesDashboardRouteProps = {
  orgId: string;
  branchScope: BranchScopeSnapshot;
  trainerOptions: TrainerOption[];
  currentUserId?: string;
  permissions: Permission[];
};

const EMPTY_CLASSES: ClassRow[] = [];

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
    priceRupees: "0",
    trainerCommissionPercent: "",
    startTime: toDateTimeLocalValue(start),
    endTime: toDateTimeLocalValue(end),
  };
}

function classFormFromEntry(entry: ClassRow) {
  return {
    name: entry.name,
    classType: entry.classType,
    description: entry.description ?? "",
    trainerId: entry.trainerId,
    maxCapacity: String(entry.maxCapacity),
    priceRupees: String((entry.pricePaise ?? 0) / 100),
    trainerCommissionPercent:
      entry.trainerCommissionBps === null || entry.trainerCommissionBps === undefined
        ? ""
        : String(entry.trainerCommissionBps / 100),
    startTime: toDateTimeLocalValue(new Date(entry.startTime)),
    endTime: toDateTimeLocalValue(new Date(entry.endTime)),
  };
}

function classStatusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "scheduled") return "lime" as const;
  if (value === "cancelled") return "red" as const;
  if (value === "completed") return "blue" as const;
  return "neutral" as const;
}

function classStatusLabel(status: string) {
  const value = status.toLowerCase();
  if (value === "scheduled") return "Scheduled";
  if (value === "cancelled") return "Cancelled";
  if (value === "completed") return "Completed";
  return "Review";
}

function statusMarkClass(tone: ReturnType<typeof classStatusTone>) {
  if (tone === "lime") return "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]";
  if (tone === "red") return "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]";
  if (tone === "blue") return "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]";
  return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]";
}

function ClassStatusMark({ status }: { status: string }) {
  const label = classStatusLabel(status);
  const tone = classStatusTone(status);
  const value = status.toLowerCase();
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${statusMarkClass(tone)}`}
    >
      <span aria-hidden>{value === "scheduled" || value === "completed" ? "✓" : "!"}</span>
    </span>
  );
}

function classTypeLabel(type: string) {
  const value = type.toLowerCase();
  if (value === "hiit") return "HIIT";
  if (value === "strength") return "Strength";
  if (value === "yoga") return "Yoga";
  if (value === "boxing") return "Boxing";
  if (value === "cycling") return "Cycling";
  if (value === "dance") return "Dance";
  if (value === "mobility") return "Mobility";
  return formatEnumLabel(type);
}

function rosterStatusLabel(status: string) {
  const value = status.toLowerCase();
  if (value === "enrolled") return "Enrolled";
  if (value === "waitlisted") return "Waitlisted";
  if (value === "cancelled") return "Cancelled";
  if (value === "attended") return "Attended";
  if (value === "no_show") return "No-show";
  return formatEnumLabel(status);
}

function classPaymentStatusLabel(status: string) {
  const value = status.toLowerCase();
  if (value === "paid") return "Paid";
  if (value === "comp") return "Comped";
  if (value === "pending") return "Payment pending";
  return formatEnumLabel(status);
}

function hoursUntil(value: string | Date) {
  return (new Date(value).getTime() - Date.now()) / 3_600_000;
}

export function ClassesDashboardRoute({
  orgId,
  branchScope,
  trainerOptions,
  currentUserId,
  permissions,
}: ClassesDashboardRouteProps) {
  const queryClient = useQueryClient();
  const selectedBranchId = branchScope.allBranches
    ? null
    : (branchScope.selectedBranch?.id ?? null);
  const selectedBranchName = branchScope.allBranches
    ? "All branches"
    : (branchScope.selectedBranch?.name ?? "Select a branch");
  const canManageAllTrainers = permissions.includes("TRAINERS_MANAGE");
  const defaultTrainerId =
    (canManageAllTrainers ? trainerOptions[0]?.id : currentUserId) ?? trainerOptions[0]?.id ?? "";
  const [form, setForm] = useState(() => defaultClassForm(defaultTrainerId));
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(() => defaultClassForm(defaultTrainerId));
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [openRosterId, setOpenRosterId] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, ClassRosterState>>({});
  const classesQuery = useClasses(orgId, selectedBranchId);
  const classes = classesQuery.data?.classes ?? EMPTY_CLASSES;
  const hasScheduleSurface = classes.length > 0 || classesQuery.isLoading;
  const trainerChoices = useMemo(
    () =>
      canManageAllTrainers
        ? trainerOptions
        : trainerOptions.filter((trainer) => trainer.id === currentUserId),
    [canManageAllTrainers, currentUserId, trainerOptions],
  );
  const scheduledClasses = useMemo(
    () => classes.filter((entry) => entry.status.toLowerCase() === "scheduled"),
    [classes],
  );
  const startingSoonCount = scheduledClasses.filter((entry) => {
    const hours = hoursUntil(entry.startTime);
    return hours >= 0 && hours <= 24;
  }).length;
  const nextClass = [...scheduledClasses].sort(
    (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
  )[0];
  const totalOpenSeats = scheduledClasses.reduce(
    (total, entry) => total + Math.max(entry.remainingCapacity ?? 0, 0),
    0,
  );
  const scheduleBlockedReason = !selectedBranchId
    ? "Choose one branch before scheduling."
    : !trainerChoices.length
      ? "Add a trainer before scheduling."
      : "";
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
          pricePaise: Math.max(0, Math.round((Number.parseFloat(form.priceRupees) || 0) * 100)),
          trainerCommissionBps: form.trainerCommissionPercent.trim()
            ? Math.max(0, Math.round((Number.parseFloat(form.trainerCommissionPercent) || 0) * 100))
            : null,
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
  const updateClassMutation = useMutation({
    mutationFn: async (classId: string) =>
      webApiFetch<{ class: ClassRow }>(`/api/orgs/${orgId}/classes/${classId}`, {
        method: "PATCH",
        body: {
          branchId: selectedBranchId ?? undefined,
          trainerId: canManageAllTrainers ? editForm.trainerId : currentUserId,
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          classType: editForm.classType.trim(),
          maxCapacity: Number(editForm.maxCapacity),
          pricePaise: Math.max(0, Math.round((Number.parseFloat(editForm.priceRupees) || 0) * 100)),
          trainerCommissionBps: editForm.trainerCommissionPercent.trim()
            ? Math.max(
                0,
                Math.round((Number.parseFloat(editForm.trainerCommissionPercent) || 0) * 100),
              )
            : null,
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
        },
        feedback: { success: "Class updated." },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classes", orgId, selectedBranchId ?? "all"],
      });
      setEditingClassId(null);
    },
  });
  const cancelClassMutation = useMutation({
    mutationFn: async (classId: string) =>
      webApiFetch<{ class: ClassRow }>(`/api/orgs/${orgId}/classes/${classId}/cancel`, {
        method: "POST",
        feedback: { success: "Class cancelled." },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["classes", orgId, selectedBranchId ?? "all"],
      });
      setConfirmCancelId(null);
    },
  });
  const loadRoster = async (classId: string) => {
    setOpenRosterId((current) => (current === classId ? null : classId));
    if (rosters[classId]?.roster.length || rosters[classId]?.loading) {
      return;
    }

    setRosters((current) => ({
      ...current,
      [classId]: { loading: true, error: "", roster: current[classId]?.roster ?? [] },
    }));
    try {
      const payload = await webApiFetch<{ roster: ClassRosterRow[] }>(
        `/api/orgs/${orgId}/classes/${classId}/roster`,
      );
      setRosters((current) => ({
        ...current,
        [classId]: { loading: false, error: "", roster: payload.roster },
      }));
    } catch (error) {
      setRosters((current) => ({
        ...current,
        [classId]: {
          loading: false,
          error: error instanceof Error ? error.message : "Roster could not load.",
          roster: current[classId]?.roster ?? [],
        },
      }));
    }
  };

  return (
    <div className="grid gap-4">
      <GlassCard variant={scheduleBlockedReason ? "warning" : "strong"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Class operations
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {scheduleBlockedReason
                ? "Finish setup before publishing classes"
                : nextClass
                  ? `Next up: ${nextClass.name}`
                  : "Build the first class for this branch"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {scheduleBlockedReason ||
                (nextClass
                  ? `${formatDateTime(nextClass.startTime)} with ${nextClass.trainerName ?? "trainer pending"}. Check roster, room setup, and payment status before members arrive.`
                  : "Choose a trainer, capacity, time, and price so members can book from their app.")}
            </p>
          </div>
          <Pill tone={scheduleBlockedReason ? "amber" : nextClass ? "blue" : "neutral"}>
            {selectedBranchName}
          </Pill>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone={scheduledClasses.length ? "blue" : "neutral"}>
            {scheduledClasses.length} scheduled
          </Pill>
          <Pill tone={totalOpenSeats ? "neutral" : "amber"}>
            {totalOpenSeats} open seats
          </Pill>
          <Pill tone={startingSoonCount ? "amber" : "neutral"}>
            {startingSoonCount} soon
          </Pill>
          <Pill tone={trainerChoices.length ? "neutral" : "amber"}>
            {trainerChoices.length} trainers
          </Pill>
        </div>
      </GlassCard>
      <div className={`grid gap-4 ${hasScheduleSurface ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
      <DashboardPageShell
        eyebrow="Classes"
        title="Schedule a group class"
        className={hasScheduleSurface ? "xl:order-2" : undefined}
        action={!selectedBranchId ? <Pill tone="amber">Choose a branch</Pill> : undefined}
      >
        <div className="grid gap-3">
          {!selectedBranchId ? (
            <GlassCard variant="warning">
              <p className="text-sm leading-6 text-[var(--text-primary)]">
                Pick one branch from the header before creating a class. The schedule stays with
                that branch.
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Price (₹)
              <input
                type="number"
                min={0}
                step="1"
                value={form.priceRupees}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priceRupees: event.target.value }))
                }
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Trainer commission override (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.trainerCommissionPercent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trainerCommissionPercent: event.target.value,
                  }))
                }
                placeholder="Use trainer default"
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Trainer
            <select
              value={
                canManageAllTrainers
                  ? form.trainerId
                  : (currentUserId ?? trainerChoices[0]?.id ?? "")
              }
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

      <GlassCard variant="strong" className={hasScheduleSurface ? "xl:order-1" : undefined}>
        <SectionHeader
          eyebrow="Upcoming"
          title="Scheduled classes"
          badge={
            <Pill>
              <CalendarDays className="h-3.5 w-3.5" />
              {classes.length} scheduled
            </Pill>
          }
        />
        <div className="mt-4 grid gap-3">
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
                No classes scheduled. Use the form on this page to add the first session for this
                branch.
              </p>
            </GlassCard>
          ) : null}
          {classes.map((entry) => (
            <ClassScheduleCard
              key={entry.id}
              entry={entry}
              showBranchName={!selectedBranchId}
              rosterState={rosters[entry.id]}
              rosterOpen={openRosterId === entry.id}
              onToggleRoster={() => void loadRoster(entry.id)}
              canManage={canManageAllTrainers}
              editing={editingClassId === entry.id}
              editForm={editForm}
              trainerChoices={trainerChoices}
              confirmCancel={confirmCancelId === entry.id}
              updatePending={updateClassMutation.isPending}
              cancelPending={cancelClassMutation.isPending}
              onStartEdit={() => {
                setEditingClassId(entry.id);
                setEditForm(classFormFromEntry(entry));
                setConfirmCancelId(null);
              }}
              onCancelEdit={() => setEditingClassId(null)}
              onEditFormChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
              onSaveEdit={() => updateClassMutation.mutate(entry.id)}
              onAskCancel={() => {
                setConfirmCancelId(entry.id);
                setEditingClassId(null);
              }}
              onDismissCancel={() => setConfirmCancelId(null)}
              onConfirmCancel={() => cancelClassMutation.mutate(entry.id)}
            />
          ))}
        </div>
      </GlassCard>
      </div>
    </div>
  );
}

function ClassScheduleCard({
  entry,
  showBranchName,
  rosterState,
  rosterOpen,
  onToggleRoster,
  canManage,
  editing,
  editForm,
  trainerChoices,
  confirmCancel,
  updatePending,
  cancelPending,
  onStartEdit,
  onCancelEdit,
  onEditFormChange,
  onSaveEdit,
  onAskCancel,
  onDismissCancel,
  onConfirmCancel,
}: {
  entry: ClassRow;
  showBranchName: boolean;
  rosterState?: ClassRosterState | undefined;
  rosterOpen: boolean;
  onToggleRoster: () => void;
  canManage: boolean;
  editing: boolean;
  editForm: ReturnType<typeof defaultClassForm>;
  trainerChoices: TrainerOption[];
  confirmCancel: boolean;
  updatePending: boolean;
  cancelPending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (patch: Partial<ReturnType<typeof defaultClassForm>>) => void;
  onSaveEdit: () => void;
  onAskCancel: () => void;
  onDismissCancel: () => void;
  onConfirmCancel: () => void;
}) {
  const isCancelled = entry.status.toLowerCase() === "cancelled";
  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-start gap-2">
            <ClassStatusMark status={entry.status} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-[var(--text-primary)]">
                {entry.name}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {classTypeLabel(entry.classType)}
              </p>
            </div>
          </div>
          <p className="mt-2 pl-9 text-sm text-[var(--text-secondary)]">
            {formatDateTime(entry.startTime)} to {formatDateTime(entry.endTime)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Pill>
            <Users className="h-3.5 w-3.5" />
            {entry.enrollmentCount}/{entry.maxCapacity}
          </Pill>
          <Pill tone={entry.pricePaise && entry.pricePaise > 0 ? "lime" : "neutral"}>
            <IndianRupee className="h-3.5 w-3.5" />
            {entry.pricePaise && entry.pricePaise > 0
              ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
                  entry.pricePaise / 100,
                )
              : "Free"}
          </Pill>
          <Pill tone="neutral">
            <UserRound className="h-3.5 w-3.5" />
            {entry.trainerName ?? "Trainer pending"}
          </Pill>
          {showBranchName && entry.branchName ? <Pill tone="neutral">{entry.branchName}</Pill> : null}
        </div>
      </div>
      {entry.remainingCapacity <= 3 && !isCancelled ? (
        <p className="mt-3 text-sm font-medium text-[var(--feedback-warning)]">
          {entry.remainingCapacity > 0
            ? `${entry.remainingCapacity} spot${entry.remainingCapacity === 1 ? "" : "s"} left`
            : "Waitlist only"}
        </p>
      ) : null}
      {entry.description ? (
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{entry.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {canManage && !isCancelled ? (
          <>
            <ZookButton type="button" size="sm" tone="ghost" onClick={onStartEdit}>
              Edit
            </ZookButton>
            <ZookButton type="button" size="sm" tone="ghost" onClick={onAskCancel}>
              Cancel class
            </ZookButton>
          </>
        ) : null}
        <ZookButton type="button" size="sm" tone="ghost" onClick={onToggleRoster}>
          {rosterOpen ? "Hide roster" : "View roster"}
        </ZookButton>
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Class name
              <input
                value={editForm.name}
                onChange={(event) => onEditFormChange({ name: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Class type
              <input
                value={editForm.classType}
                onChange={(event) => onEditFormChange({ classType: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Starts
              <input
                type="datetime-local"
                value={editForm.startTime}
                onChange={(event) => onEditFormChange({ startTime: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Ends
              <input
                type="datetime-local"
                value={editForm.endTime}
                onChange={(event) => onEditFormChange({ endTime: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Capacity
              <input
                type="number"
                min={1}
                value={editForm.maxCapacity}
                onChange={(event) => onEditFormChange({ maxCapacity: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Price (₹)
              <input
                type="number"
                min={0}
                value={editForm.priceRupees}
                onChange={(event) => onEditFormChange({ priceRupees: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Commission (%)
              <input
                type="number"
                min={0}
                max={100}
                value={editForm.trainerCommissionPercent}
                onChange={(event) =>
                  onEditFormChange({ trainerCommissionPercent: event.target.value })
                }
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Trainer
            <select
              value={editForm.trainerId}
              onChange={(event) => onEditFormChange({ trainerId: event.target.value })}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
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
              value={editForm.description}
              onChange={(event) => onEditFormChange({ description: event.target.value })}
              rows={3}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <ZookButton type="button" size="sm" tone="ghost" onClick={onCancelEdit}>
              Close
            </ZookButton>
            <ZookButton
              type="button"
              size="sm"
              onClick={onSaveEdit}
              state={updatePending ? "loading" : "idle"}
              disabled={updatePending || !editForm.name.trim() || !editForm.trainerId}
            >
              Save
            </ZookButton>
          </div>
        </div>
      ) : null}
      {confirmCancel ? (
        <div className="mt-4 rounded-[22px] border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Cancel this class? Enrolments will stop and the card will show as cancelled.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ZookButton type="button" size="sm" tone="ghost" onClick={onDismissCancel}>
              Keep class
            </ZookButton>
            <ZookButton
              type="button"
              size="sm"
              tone="danger"
              onClick={onConfirmCancel}
              state={cancelPending ? "loading" : "idle"}
              disabled={cancelPending}
            >
              Confirm cancel
            </ZookButton>
          </div>
        </div>
      ) : null}
      {rosterOpen ? (
        <div className="mt-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Class roster</p>
            <Pill tone="neutral">{rosterState?.roster.length ?? 0} members</Pill>
          </div>
          {rosterState?.loading ? (
            <div className="mt-4 grid gap-2" aria-label="Loading class roster">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-2xl bg-[var(--surface)]" />
              ))}
            </div>
          ) : null}
          {rosterState?.error ? (
            <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-3 text-sm text-[var(--feedback-danger)]">
              {rosterState.error}
            </p>
          ) : null}
          {!rosterState?.loading && !rosterState?.error && !rosterState?.roster.length ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              No members enrolled yet.
            </p>
          ) : null}
          {rosterState?.roster.length ? (
            <div className="mt-4 divide-y divide-[var(--border-subtle)]">
              {rosterState.roster.map((member) => (
                <div
                  key={member.memberId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{member.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Enrolled {formatDateTime(member.enrolledAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={rosterStatusLabel(member.status)} />
                    {member.paymentStatus ? (
                      <Pill
                        tone={
                          member.paymentStatus === "paid"
                            ? "lime"
                            : member.paymentStatus === "comp"
                              ? "neutral"
                              : "amber"
                        }
                      >
                        {classPaymentStatusLabel(member.paymentStatus)}
                      </Pill>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
