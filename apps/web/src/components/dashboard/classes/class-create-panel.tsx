"use client";

import {
  DashboardPageShell,
} from "@/components/dashboard-primitives/layout";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import type { useT } from "@/lib/use-t";

type TrainerOption = {
  id: string;
  name: string;
};

type ClassForm = {
  name: string;
  classType: string;
  description: string;
  trainerId: string;
  maxCapacity: string;
  priceRupees: string;
  trainerCommissionPercent: string;
  startTime: string;
  endTime: string;
};

type ClassesT = ReturnType<typeof useT>;

export function ClassCreatePanel({
  form,
  trainerChoices,
  canManageAllTrainers,
  currentUserId,
  selectedBranchId,
  hasScheduleSurface,
  createPending,
  onFormChange,
  onSubmit,
  t,
}: {
  form: ClassForm;
  trainerChoices: TrainerOption[];
  canManageAllTrainers: boolean;
  currentUserId?: string | undefined;
  selectedBranchId: string | null;
  hasScheduleSurface: boolean;
  createPending: boolean;
  onFormChange: (patch: Partial<ClassForm>) => void;
  onSubmit: () => void;
  t: ClassesT;
}) {
  return (
    <DashboardPageShell
      eyebrow={t("eyebrow")}
      title={t("scheduleGroupClass")}
      className={hasScheduleSurface ? "xl:order-2" : undefined}
      action={!selectedBranchId ? <Pill tone="amber">{t("chooseBranch")}</Pill> : undefined}
    >
      <div className="grid gap-3">
        {!selectedBranchId ? (
          <GlassCard variant="warning">
            <p className="text-sm leading-6 text-[var(--text-primary)]">
              {t("pickBranchBeforeCreating")}
            </p>
          </GlassCard>
        ) : null}
        {!trainerChoices.length ? (
          <GlassCard variant="warning">
            <p className="text-sm leading-6 text-[var(--text-primary)]">
              {t("addTrainerInStaff")}
            </p>
          </GlassCard>
        ) : null}
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          {t("className")}
          <input
            value={form.name}
            onChange={(event) => onFormChange({ name: event.target.value })}
            placeholder={t("classNamePlaceholder")}
            className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("classType")}
            <input
              value={form.classType}
              onChange={(event) => onFormChange({ classType: event.target.value })}
              placeholder={t("classTypePlaceholder")}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("capacity")}
            <input
              type="number"
              min={1}
              value={form.maxCapacity}
              onChange={(event) => onFormChange({ maxCapacity: event.target.value })}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("starts")}
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => onFormChange({ startTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("ends")}
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => onFormChange({ endTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("price")}
            <input
              type="number"
              min={0}
              step="1"
              value={form.priceRupees}
              onChange={(event) => onFormChange({ priceRupees: event.target.value })}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {t("trainerCommissionOverride")}
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.trainerCommissionPercent}
              onChange={(event) => onFormChange({ trainerCommissionPercent: event.target.value })}
              placeholder={t("useTrainerDefault")}
              className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          {t("trainer")}
          <select
            value={
              canManageAllTrainers
                ? form.trainerId
                : (currentUserId ?? trainerChoices[0]?.id ?? "")
            }
            disabled={!canManageAllTrainers}
            onChange={(event) => onFormChange({ trainerId: event.target.value })}
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
          {t("notes")}
          <textarea
            value={form.description}
            onChange={(event) => onFormChange({ description: event.target.value })}
            rows={4}
            placeholder={t("notesPlaceholder")}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
          />
        </label>
        <ZookButton
          onClick={onSubmit}
          disabled={
            createPending ||
            !selectedBranchId ||
            !trainerChoices.length ||
            !form.name.trim() ||
            !(canManageAllTrainers ? form.trainerId : currentUserId)
          }
          state={createPending ? "loading" : "idle"}
          fullWidth
        >
          {t("scheduleClass")}
        </ZookButton>
      </div>
    </DashboardPageShell>
  );
}
