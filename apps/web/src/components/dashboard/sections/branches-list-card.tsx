"use client";

import type { Dispatch, SetStateAction } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type {
  BranchRow,
  StaffAssignmentRow,
  StaffUserRow,
} from "@/components/dashboard/types";
import { formatBranchHoursSummary } from "./branch-hours-editor";
import type { BranchFormState } from "./branches-section";
import { BranchForm } from "./branch-form";
import { useT } from "@/lib/use-t";

type BranchManagementT = ReturnType<typeof useT>;

function branchSetupSteps(
  branch: BranchRow,
  hasReceptionist: boolean,
  hasBranchPlan: boolean,
  t: BranchManagementT,
) {
  const hasMapLocation = branch.latitude != null || branch.longitude != null || Boolean(branch.googleMapsUrl);
  return [
    { label: t("stepCreated"), done: true },
    { label: t("stepMap"), done: hasMapLocation },
    { label: t("stepManager"), done: Boolean(branch.managerId) },
    { label: t("stepHours"), done: Boolean(branch.operatingHours) },
    { label: t("stepReception"), done: hasReceptionist },
    { label: t("stepPlans"), done: hasBranchPlan },
  ];
}

function BranchStatusMark({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex min-h-7 shrink-0 items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold ${
        active
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-[color-mix(in_srgb,var(--feedback-warning)_38%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
      }`}
    >
      {label}
    </span>
  );
}

function compactBranchLocation(branch: BranchRow) {
  return [branch.city, branch.state].filter(Boolean).join(", ") || undefined;
}

function compactBranchAddress(branch: BranchRow) {
  const location = compactBranchLocation(branch);
  const address = branch.address?.trim();
  if (!address) return null;
  if (location && address.toLowerCase() === location.toLowerCase()) return null;
  return address;
}

export function BranchesListCard({
  branches,
  branchesState,
  branchEditForm,
  setBranchEditForm,
  editingBranchId,
  setEditingBranchId,
  staffAssignments,
  staffUsersById,
  hasActivePlan,
  formBusy,
  saveBranchEdit,
  startBranchEdit,
  updateBranch,
  deactivateBranch,
}: {
  branches: BranchRow[];
  branchesState: { error?: string | null; loading: boolean };
  branchEditForm: BranchFormState;
  setBranchEditForm: Dispatch<SetStateAction<BranchFormState>>;
  editingBranchId: string | null;
  setEditingBranchId: Dispatch<SetStateAction<string | null>>;
  staffAssignments: StaffAssignmentRow[];
  staffUsersById: Map<string, StaffUserRow>;
  hasActivePlan: boolean;
  formBusy: string | null;
  saveBranchEdit: (branch: BranchRow) => Promise<void>;
  startBranchEdit: (branch: BranchRow) => void;
  updateBranch: (branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) => Promise<void>;
  deactivateBranch: (branch: BranchRow) => Promise<void>;
}) {
  const t = useT("branchManagement");
  const receptionistBranchIds = new Set(
    staffAssignments
      .filter((assignment) => assignment.role === "RECEPTIONIST" && assignment.branchId)
      .map((assignment) => assignment.branchId),
  );
  const activeBranches = branches.filter((branch) => branch.active !== false);
  const missingManagerCount = activeBranches.filter((branch) => !branch.managerId).length;
  const missingHoursCount = activeBranches.filter((branch) => !branch.operatingHours).length;
  const missingReceptionCount = activeBranches.filter((branch) => !receptionistBranchIds.has(branch.id)).length;
  const missingMapCount = activeBranches.filter(
    (branch) => branch.latitude == null && branch.longitude == null && !branch.googleMapsUrl,
  ).length;
  const summaryItems = [
    { label: t("needManager"), value: missingManagerCount },
    { label: t("needHours"), value: missingHoursCount },
    { label: t("needReception"), value: missingReceptionCount },
    { label: t("needMap"), value: missingMapCount },
  ].filter((item) => item.value > 0);

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("locationsEyebrow")}
        title={t("branchList")}
        badge={<Pill>{activeBranches.length} {t("active")}</Pill>}
      />
      <div className="mt-5 grid gap-3">
        {branchesState.error ? <ErrorNotice message={branchesState.error} /> : null}
        {branches.length && summaryItems.length ? (
          <div className="flex flex-wrap gap-2">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5"
              >
                <span className="text-xs text-[var(--text-tertiary)]">{item.label}</span>
                <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : branches.length ? (
          <div className="inline-flex w-fit rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">
            {t("readyForOps")}
          </div>
        ) : null}
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
            {editingBranchId === branch.id ? (
              <BranchForm
                mode="edit"
                variant="full"
                form={branchEditForm}
                setForm={setBranchEditForm}
                onSubmit={() => void saveBranchEdit(branch)}
                onCancel={() => setEditingBranchId(null)}
                formBusy={formBusy === `branch:${branch.id}`}
                staffAssignments={staffAssignments}
                staffUsersById={staffUsersById}
              />
            ) : (
              <BranchSummaryRow
                branch={branch}
                formBusy={formBusy}
                hasActivePlan={hasActivePlan}
                hasReceptionist={receptionistBranchIds.has(branch.id)}
                t={t}
                onDeactivate={deactivateBranch}
                onEdit={startBranchEdit}
                onUpdate={updateBranch}
              />
            )}
          </div>
        ))}
        {!branches.length && !branchesState.loading ? (
          <EmptyState
            title={t("noBranchesTitle")}
            description={t("noBranchesDescription")}
          />
        ) : null}
      </div>
    </GlassCard>
  );
}

function BranchSummaryRow({
  branch,
  formBusy,
  hasActivePlan,
  hasReceptionist,
  t,
  onDeactivate,
  onEdit,
  onUpdate,
}: {
  branch: BranchRow;
  formBusy: string | null;
  hasActivePlan: boolean;
  hasReceptionist: boolean;
  t: BranchManagementT;
  onDeactivate: (branch: BranchRow) => Promise<void>;
  onEdit: (branch: BranchRow) => void;
  onUpdate: (branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) => Promise<void>;
}) {
  const branchHoursSummaryLabels = {
    closedAllWeek: t("closedAllWeek"),
    workingHoursSet: t("stepHours"),
    everyDay: t("everyDay"),
    customWorkingHoursSet: t("customWorkingHoursSet"),
    days: {
      mon: t("dayMonShort"),
      tue: t("dayTueShort"),
      wed: t("dayWedShort"),
      thu: t("dayThuShort"),
      fri: t("dayFriShort"),
      sat: t("daySatShort"),
      sun: t("daySunShort"),
    },
  };
  const steps = branchSetupSteps(branch, hasReceptionist, hasActivePlan, t);
  const missingSteps = steps.filter((step) => !step.done);
  const statusLabel = branch.isDefault ? t("primary") : branch.active ? t("active") : t("paused");
  const hasMapPin = branch.latitude != null && branch.longitude != null;
  const hasPublishedMap = Boolean(branch.googleMapsUrl) || hasMapPin;
  const branchLocation = compactBranchLocation(branch);
  const branchAddress = compactBranchAddress(branch);
  const fallbackMapsHref =
    branchAddress || branchLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [branchAddress, branchLocation].filter(Boolean).join(", "),
        )}`
      : null;
  const mapsHref =
    branch.googleMapsUrl ??
    (hasMapPin
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${branch.latitude},${branch.longitude}`,
        )}`
      : fallbackMapsHref);
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <BranchStatusMark
            label={statusLabel}
            active={branch.isDefault || branch.active !== false}
          />
          <div className="min-w-0">
            <p className="font-semibold leading-5 text-[var(--text-primary)]">{branch.name}</p>
            <p className="mt-0.5 text-xs leading-4 text-[var(--text-tertiary)]">
              {branchLocation ?? t("locationPending")}
            </p>
          </div>
        </div>
        <div
          className={`mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            hasPublishedMap
              ? "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "border-[color-mix(in_srgb,var(--feedback-warning)_34%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
          }`}
        >
          <MapPinned aria-hidden size={13} />
          <span className="truncate">
            {hasPublishedMap ? t("mapVisibleToMembers") : t("mapNotSet")}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          {branchAddress ? (
            <span className="max-w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1">
              {branchAddress}
            </span>
          ) : null}
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1">
            {formatBranchHoursSummary(branch.operatingHours, branchHoursSummaryLabels)}
          </span>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1 text-[var(--text-tertiary)]">
            {hasPublishedMap ? t("visibleOnAppWeb") : t("addMapToPublish")}
          </span>
        </div>
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            {missingSteps.length
              ? t(missingSteps.length === 1 ? "setupGap" : "setupGaps", {
                  count: missingSteps.length,
                })
              : t("readyForOps")}
            <span className="group-open:hidden">{t("show")}</span>
            <span className="hidden group-open:inline">{t("hide")}</span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {(missingSteps.length ? missingSteps : steps).map((step) => (
              <span
                key={step.label}
                className={`rounded-full border px-2 py-1 text-[0.68rem] ${
                  step.done
                    ? "border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-tertiary)]"
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </details>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {hasPublishedMap && mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="zook-focus inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)]"
          >
            <ExternalLink aria-hidden size={13} />
            {t("openMap")}
          </a>
        ) : (
          <ZookButton
            type="button"
            tone="ghost"
            size="sm"
            onClick={() => onEdit(branch)}
          >
            {t("addMap")}
          </ZookButton>
        )}
        <ZookButton
          type="button"
          tone="ghost"
          size="sm"
          onClick={() => onEdit(branch)}
        >
          {t("edit")}
        </ZookButton>
        {!branch.isDefault ? (
          <details className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1">
            <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--text-secondary)]">
              {t("more")}
            </summary>
            <div className="mt-3 flex min-w-40 flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-md)]">
              <ConfirmActionButton
                title={t("makePrimaryTitle")}
                description={t("makePrimaryDescription")}
                confirmLabel={t("makePrimary")}
                onConfirm={() => onUpdate(branch, { isDefault: true, active: true })}
                disabled={formBusy === `branch:${branch.id}`}
                className="zook-focus rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {t("makePrimary")}
              </ConfirmActionButton>
              {branch.active ? (
                <ConfirmActionButton
                  title={t("deactivateTitle")}
                  description={t("deactivateDescription")}
                  confirmLabel={t("deactivate")}
                  onConfirm={() => onDeactivate(branch)}
                  disabled={formBusy === `branch:${branch.id}:delete`}
                  className="zook-focus rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_28%,transparent)] px-3 py-1 text-xs text-[var(--feedback-danger)] hover:bg-[var(--surface-danger-soft)] disabled:opacity-50"
                >
                  {t("deactivate")}
                </ConfirmActionButton>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
