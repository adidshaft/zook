"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import type { Permission } from "@zook/core";
import {
  SectionHeader,
} from "@/components/dashboard-primitives/layout";
import { GlassCard, Pill } from "@/components/glass-card";
import type { BranchScopeSnapshot, ClassRow } from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";
import { useClasses } from "@/lib/query-hooks/classes";
import { useT } from "@/lib/use-t";
import { ClassCreatePanel } from "./class-create-panel";
import { ClassScheduleCard } from "./class-schedule-card";
import { ClassesOverviewCard } from "./classes-overview-card";

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
  const t = useT("classes");
  const queryClient = useQueryClient();
  const selectedBranchId = branchScope.allBranches
    ? null
    : (branchScope.selectedBranch?.id ?? null);
  const selectedBranchName = branchScope.allBranches
    ? t("allBranches")
    : (branchScope.selectedBranch?.name ?? t("selectBranch"));
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
    ? t("chooseBranchBeforeScheduling")
    : !trainerChoices.length
      ? t("addTrainerBeforeScheduling")
      : "";
  const createClassMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranchId) {
        throw new Error(t("chooseBranchBeforeSchedulingClass"));
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
        feedback: { success: t("classScheduledToast") },
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
        feedback: { success: t("classUpdatedToast") },
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
        feedback: { success: t("classCancelledToast") },
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
          error: error instanceof Error ? error.message : t("rosterCouldNotLoad"),
          roster: current[classId]?.roster ?? [],
        },
      }));
    }
  };

  return (
    <div className="grid gap-4">
      <ClassesOverviewCard
        nextClass={nextClass}
        scheduleBlockedReason={scheduleBlockedReason}
        scheduledCount={scheduledClasses.length}
        selectedBranchName={selectedBranchName}
        startingSoonCount={startingSoonCount}
        totalOpenSeats={totalOpenSeats}
        trainerCount={trainerChoices.length}
        t={t}
      />
      <div className={`grid gap-4 ${hasScheduleSurface ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
      <ClassCreatePanel
        form={form}
        trainerChoices={trainerChoices}
        canManageAllTrainers={canManageAllTrainers}
        currentUserId={currentUserId}
        selectedBranchId={selectedBranchId}
        hasScheduleSurface={hasScheduleSurface}
        createPending={createClassMutation.isPending}
        onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={() => createClassMutation.mutate()}
        t={t}
      />

      <GlassCard variant="strong" className={hasScheduleSurface ? "xl:order-1" : undefined}>
        <SectionHeader
          eyebrow={t("upcoming")}
          title={t("scheduledClasses")}
          badge={
            <Pill>
              <CalendarDays className="h-3.5 w-3.5" />
              {t("scheduledCount", { count: classes.length })}
            </Pill>
          }
        />
        <div className="mt-4 grid gap-3">
          {classesQuery.isLoading ? (
            <GlassCard variant="muted">
              <p className="text-sm text-[var(--text-secondary)]">{t("loadingUpcoming")}</p>
            </GlassCard>
          ) : null}
          {classesQuery.isError ? (
            <GlassCard variant="danger">
              <p className="text-sm text-[var(--text-primary)]">
                {(classesQuery.error as Error).message || t("classesCouldNotLoad")}
              </p>
            </GlassCard>
          ) : null}
          {!classesQuery.isLoading && !classes.length ? (
            <GlassCard variant="muted">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("noClassesScheduled")}
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
              t={t}
            />
          ))}
        </div>
      </GlassCard>
      </div>
    </div>
  );
}
