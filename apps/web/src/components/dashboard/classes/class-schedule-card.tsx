"use client";

import { IndianRupee, UserRound, Users } from "lucide-react";
import {
  StatusPill,
} from "@/components/dashboard-primitives/layout";
import { Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import type { ClassRow } from "@/components/dashboard/types";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import type { useT } from "@/lib/use-t";

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

function classStatusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "scheduled") return "lime" as const;
  if (value === "cancelled") return "red" as const;
  if (value === "completed") return "blue" as const;
  return "neutral" as const;
}

function classStatusLabel(status: string, t: ClassesT) {
  const value = status.toLowerCase();
  if (value === "scheduled") return t("statusScheduled");
  if (value === "cancelled") return t("statusCancelled");
  if (value === "completed") return t("statusCompleted");
  return t("statusReview");
}

function statusMarkClass(tone: ReturnType<typeof classStatusTone>) {
  if (tone === "lime") return "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]";
  if (tone === "red") return "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]";
  if (tone === "blue") return "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]";
  return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]";
}

function ClassStatusMark({ status, label }: { status: string; label: string }) {
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

function classTypeLabel(type: string, t: ClassesT) {
  const value = type.toLowerCase();
  if (value === "hiit") return "HIIT";
  if (value === "strength") return t("typeStrength");
  if (value === "yoga") return t("typeYoga");
  if (value === "boxing") return t("typeBoxing");
  if (value === "cycling") return t("typeCycling");
  if (value === "dance") return t("typeDance");
  if (value === "mobility") return t("typeMobility");
  return formatEnumLabel(type);
}

function rosterStatusLabel(status: string, t: ClassesT) {
  const value = status.toLowerCase();
  if (value === "enrolled") return t("rosterStatusEnrolled");
  if (value === "waitlisted") return t("rosterStatusWaitlisted");
  if (value === "cancelled") return t("statusCancelled");
  if (value === "attended") return t("rosterStatusAttended");
  if (value === "no_show") return t("rosterStatusNoShow");
  return formatEnumLabel(status);
}

function classPaymentStatusLabel(status: string, t: ClassesT) {
  const value = status.toLowerCase();
  if (value === "paid") return t("paymentPaid");
  if (value === "comp") return t("paymentComped");
  if (value === "pending") return t("paymentPending");
  return formatEnumLabel(status);
}

export function ClassScheduleCard({
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
  t,
}: {
  entry: ClassRow;
  showBranchName: boolean;
  rosterState?: ClassRosterState | undefined;
  rosterOpen: boolean;
  onToggleRoster: () => void;
  canManage: boolean;
  editing: boolean;
  editForm: ClassForm;
  trainerChoices: TrainerOption[];
  confirmCancel: boolean;
  updatePending: boolean;
  cancelPending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditFormChange: (patch: Partial<ClassForm>) => void;
  onSaveEdit: () => void;
  onAskCancel: () => void;
  onDismissCancel: () => void;
  onConfirmCancel: () => void;
  t: ClassesT;
}) {
  const isCancelled = entry.status.toLowerCase() === "cancelled";
  const statusLabel = classStatusLabel(entry.status, t);
  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-start gap-2">
            <ClassStatusMark status={entry.status} label={statusLabel} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-[var(--text-primary)]">
                {entry.name}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {classTypeLabel(entry.classType, t)}
              </p>
            </div>
          </div>
          <p className="mt-2 pl-9 text-sm text-[var(--text-secondary)]">
            {t("timeRange", { start: formatDateTime(entry.startTime), end: formatDateTime(entry.endTime) })}
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
              : t("free")}
          </Pill>
          <Pill tone="neutral">
            <UserRound className="h-3.5 w-3.5" />
            {entry.trainerName ?? t("trainerPending")}
          </Pill>
          {showBranchName && entry.branchName ? <Pill tone="neutral">{entry.branchName}</Pill> : null}
        </div>
      </div>
      {entry.remainingCapacity <= 3 && !isCancelled ? (
        <p className="mt-3 text-sm font-medium text-[var(--feedback-warning)]">
          {entry.remainingCapacity > 0
            ? t("spotsLeft", { count: entry.remainingCapacity })
            : t("waitlistOnly")}
        </p>
      ) : null}
      {entry.description ? (
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{entry.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {canManage && !isCancelled ? (
          <>
            <ZookButton type="button" size="sm" tone="ghost" onClick={onStartEdit}>
              {t("edit")}
            </ZookButton>
            <ZookButton type="button" size="sm" tone="ghost" onClick={onAskCancel}>
              {t("cancelClass")}
            </ZookButton>
          </>
        ) : null}
        <ZookButton type="button" size="sm" tone="ghost" onClick={onToggleRoster}>
          {rosterOpen ? t("hideRoster") : t("viewRoster")}
        </ZookButton>
      </div>
      {editing ? (
        <div className="mt-4 grid gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("className")}
              <input
                value={editForm.name}
                onChange={(event) => onEditFormChange({ name: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("classType")}
              <input
                value={editForm.classType}
                onChange={(event) => onEditFormChange({ classType: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("starts")}
              <input
                type="datetime-local"
                value={editForm.startTime}
                onChange={(event) => onEditFormChange({ startTime: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("ends")}
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
              {t("capacity")}
              <input
                type="number"
                min={1}
                value={editForm.maxCapacity}
                onChange={(event) => onEditFormChange({ maxCapacity: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("price")}
              <input
                type="number"
                min={0}
                value={editForm.priceRupees}
                onChange={(event) => onEditFormChange({ priceRupees: event.target.value })}
                className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("commission")}
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
            {t("trainer")}
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
            {t("notes")}
            <textarea
              value={editForm.description}
              onChange={(event) => onEditFormChange({ description: event.target.value })}
              rows={3}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <ZookButton type="button" size="sm" tone="ghost" onClick={onCancelEdit}>
              {t("close")}
            </ZookButton>
            <ZookButton
              type="button"
              size="sm"
              onClick={onSaveEdit}
              state={updatePending ? "loading" : "idle"}
              disabled={updatePending || !editForm.name.trim() || !editForm.trainerId}
            >
              {t("save")}
            </ZookButton>
          </div>
        </div>
      ) : null}
      {confirmCancel ? (
        <div className="mt-4 rounded-[22px] border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("cancelThisClassDescription")}
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ZookButton type="button" size="sm" tone="ghost" onClick={onDismissCancel}>
              {t("keepClass")}
            </ZookButton>
            <ZookButton
              type="button"
              size="sm"
              tone="danger"
              onClick={onConfirmCancel}
              state={cancelPending ? "loading" : "idle"}
              disabled={cancelPending}
            >
              {t("confirmCancel")}
            </ZookButton>
          </div>
        </div>
      ) : null}
      {rosterOpen ? (
        <div className="mt-4 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("classRoster")}</p>
            <Pill tone="neutral">{t("membersCount", { count: rosterState?.roster.length ?? 0 })}</Pill>
          </div>
          {rosterState?.loading ? (
            <div className="mt-4 grid gap-2" aria-label={t("loadingClassRoster")}>
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
              {t("noMembersEnrolled")}
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
                      {t("enrolledAt", { date: formatDateTime(member.enrolledAt) })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={rosterStatusLabel(member.status, t)} />
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
                        {classPaymentStatusLabel(member.paymentStatus, t)}
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
