"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn, SearchableSelect } from "../../ui";
import { ZookButton } from "../../zook-button";
import type {
  BranchRow,
  CoachPlanRow,
  OrganizationSnapshot,
  StaffAssignmentRow,
  StaffRole,
  StaffUserRow,
} from "@/components/dashboard/types";
import { formatDate, formatDateTime, formatEnumLabel } from "@/lib/format";
import { useT } from "@/lib/use-t";

type ResourceState = {
  error: string;
  loading: boolean;
};

type StaffInviteState = {
  email: string;
  role: StaffRole;
  branchId: string;
};

type StaffSectionProps = {
  organization: OrganizationSnapshot;
  staffInvite: StaffInviteState;
  setStaffInvite: Dispatch<SetStateAction<StaffInviteState>>;
  staffAssignments: StaffAssignmentRow[];
  staffUsersById: Map<string, StaffUserRow>;
  staffState: ResourceState;
  editingStaffId: string | null;
  setEditingStaffId: Dispatch<SetStateAction<string | null>>;
  staffRoleDraft: StaffRole;
  setStaffRoleDraft: Dispatch<SetStateAction<StaffRole>>;
  staffBranchDraft: string;
  setStaffBranchDraft: Dispatch<SetStateAction<string>>;
  branches: BranchRow[];
  coachPlans: CoachPlanRow[];
  coachPlansState: ResourceState;
  formError: string;
  formStatus: string;
  formBusy: string | null;
  inviteStaff: () => Promise<void>;
  updateStaffRole: (assignmentId: string) => Promise<void>;
  revokeStaff: (assignmentId: string) => Promise<void>;
  deleteCoachPlan: (plan: CoachPlanRow) => Promise<void>;
};

type StaffT = ReturnType<typeof useT>;

function roleLabel(role: string, t: StaffT) {
  if (role === "TRAINER") return t("roleTrainer");
  if (role === "RECEPTIONIST") return t("roleReception");
  if (role === "ADMIN") return t("roleAdmin");
  if (role === "OWNER") return t("roleOwner");
  return formatEnumLabel(role);
}

function CompactMark({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "accent" | "amber";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
      : tone === "amber"
        ? "border-[color-mix(in_srgb,var(--feedback-warning)_45%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
        : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]";

  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${toneClass}`}
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function StaffSection({
  staffInvite,
  setStaffInvite,
  staffAssignments,
  staffUsersById,
  staffState,
  editingStaffId,
  setEditingStaffId,
  staffRoleDraft,
  setStaffRoleDraft,
  staffBranchDraft,
  setStaffBranchDraft,
  branches,
  coachPlans,
  coachPlansState,
  formError,
  formStatus,
  formBusy,
  inviteStaff,
  updateStaffRole,
  revokeStaff,
  deleteCoachPlan,
}: StaffSectionProps) {
  const t = useT("staff");
  const activeBranches = branches.filter((branch) => branch.active !== false);
  const receptionistNeedsBranch = staffInvite.role === "RECEPTIONIST" && activeBranches.length === 0;
  const canInviteStaff = formBusy !== "staff" && !receptionistNeedsBranch;
  const [showInviteForm, setShowInviteForm] = useState(staffAssignments.length === 0);
  const roleCapabilitySections = [
    {
      title: t("roleReception"),
      items: [
        t("capCheckInMembers"),
        t("capOverrideEntry"),
        t("capApproveRejectEntries"),
        t("capRecordPayments"),
        t("capVerifyPickups"),
        t("capSendDeskUpdates"),
      ],
    },
    {
      title: t("roleAdmin"),
      items: [
        t("capManageMembers"),
        t("capManagePlans"),
        t("capManageShop"),
        t("capBroadcastMessages"),
        t("capViewReports"),
        t("capManageBranchesStaff"),
      ],
    },
    {
      title: t("roleOwner"),
      items: [
        t("capManageBilling"),
        t("capRefundPayments"),
        t("capTransferOwnership"),
        t("capModifyPermissions"),
        t("capManageEveryWorkflow"),
      ],
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <GlassCard>
        {showInviteForm ? (
        <div className="mb-5 grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t("inviteStaff")}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {t("inviteDescription")}
              </p>
            </div>
            {staffAssignments.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="zook-focus rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {t("hide")}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {t("staffEmail")}
              <input
                value={staffInvite.email}
                onChange={(event) =>
                  setStaffInvite((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="staff@example.com"
                type="email"
                className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
            </label>
            <SearchableSelect
              label={t("role")}
              value={staffInvite.role}
              onChange={(role) =>
                setStaffInvite((current) => ({
                  ...current,
                  role: role as StaffRole,
                  branchId: role === "RECEPTIONIST" ? current.branchId : "",
                }))
              }
              options={[
                { value: "TRAINER", label: t("roleTrainer") },
                { value: "RECEPTIONIST", label: t("roleReception") },
                { value: "ADMIN", label: t("roleAdmin") },
              ]}
            />
          </div>
          {staffInvite.role === "RECEPTIONIST" ? (
            activeBranches.length > 0 ? (
              <SearchableSelect
                label={t("assignBranch")}
                placeholder={t("assignBranch")}
                value={staffInvite.branchId}
                onChange={(branchId) => setStaffInvite((current) => ({ ...current, branchId }))}
                options={activeBranches.map((branch) => ({ value: branch.id, label: branch.name }))}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text-primary)]">{t("addBranchBeforeReception")}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
                  {t("receptionBranchDescription")}
                </p>
                <Link
                  href="/dashboard/settings?section=branches"
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--accent-strong)] hover:underline"
                >
                  {t("addBranch")}
                </Link>
              </div>
            )
          ) : null}
          <ZookButton
            type="button"
            onClick={() => void inviteStaff()}
            disabled={!canInviteStaff}
            state={formBusy === "staff" ? "loading" : "idle"}
            fullWidth
          >
            {formBusy === "staff" ? t("inviting") : t("inviteStaff")}
          </ZookButton>
          {formError ? <p className="text-sm text-[var(--feedback-danger)]">{formError}</p> : null}
          {formStatus ? <p className="text-sm text-[var(--feedback-success)]">{formStatus}</p> : null}
        </div>
        ) : null}
        <SectionHeader
          eyebrow={t("team")}
          title={t("operationalRoles")}
          badge={<Pill>{t("assignmentsCount", { count: staffAssignments.length })}</Pill>}
          action={
            !showInviteForm ? (
              <button
                type="button"
                onClick={() => setShowInviteForm(true)}
                className="zook-focus rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {t("inviteStaff")}
              </button>
            ) : undefined
          }
        />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          {t("createdInTrainerApp")}
        </ManagedOn>
        <div className="mt-5">
          {staffState.error ? (
            <ErrorNotice message={staffState.error} />
          ) : staffState.loading && staffAssignments.length === 0 ? (
            <EmptyState title={t("loadingStaff")} />
          ) : (
            <DataTable
              columns={[
                {
                  id: "person",
                  header: t("staff"),
                  render: (assignment) => {
                    const staffUser = staffUsersById.get(assignment.userId);
                    const contact = staffUser?.phone ?? staffUser?.email ?? t("contactMissing");
                    return (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {staffUser?.name ?? t("staffUser")}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                        {t("assignedLine", { contact, date: formatDate(assignment.createdAt) })}
                      </p>
                    </div>
                    );
                  },
                },
                {
                  id: "access",
                  header: t("access"),
                  render: (assignment) =>
                    editingStaffId === assignment.id ? (
                      <div className="grid min-w-[180px] gap-2">
                        <select
                          value={staffRoleDraft}
                          onChange={(event) => setStaffRoleDraft(event.target.value as StaffRole)}
                          className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="TRAINER" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            {t("roleTrainer")}
                          </option>
                          <option value="RECEPTIONIST" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            {t("roleReception")}
                          </option>
                          <option value="ADMIN" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            {t("roleAdmin")}
                          </option>
                        </select>
                        <select
                          value={staffBranchDraft}
                          onChange={(event) => setStaffBranchDraft(event.target.value)}
                          className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            {t("allBranches")}
                          </option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <CompactMark
                          label={roleLabel(assignment.role, t)}
                          tone={assignment.role === "OWNER" ? "accent" : "neutral"}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[var(--text-primary)]">
                            {roleLabel(assignment.role, t)}
                          </span>
                          <span className="block truncate text-xs text-[var(--text-tertiary)]">
                            {branches.find((branch) => branch.id === assignment.branchId)?.name ??
                              t("allBranches")}
                          </span>
                        </span>
                      </div>
                    ),
                },
                {
                  id: "actions",
                  header: t("manage"),
                  align: "right",
                  render: (assignment) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      {editingStaffId === assignment.id ? (
                        <>
                          <ZookButton
                            type="button"
                            size="sm"
                            onClick={() => void updateStaffRole(assignment.id)}
                            disabled={formBusy === `staff:${assignment.id}`}
                            state={formBusy === `staff:${assignment.id}` ? "loading" : "idle"}
                          >
                            {t("save")}
                          </ZookButton>
                          <ZookButton
                            type="button"
                            tone="ghost"
                            size="sm"
                            onClick={() => setEditingStaffId(null)}
                          >
                            {t("cancel")}
                          </ZookButton>
                        </>
                      ) : (
                        <ZookButton
                          type="button"
                          tone="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStaffId(assignment.id);
                            setStaffRoleDraft(assignment.role as StaffRole);
                            setStaffBranchDraft(assignment.branchId ?? "");
                          }}
                        >
                          {t("edit")}
                        </ZookButton>
                      )}
                      {editingStaffId === assignment.id && assignment.role !== "OWNER" ? (
                        <ConfirmActionButton
                          title={t("revokeStaffTitle")}
                          description={t("revokeStaffDescription")}
                          confirmLabel={t("revoke")}
                          onConfirm={() => revokeStaff(assignment.id)}
                          disabled={formBusy === `staff:${assignment.id}:revoke`}
                          className="zook-focus rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_26%,transparent)] bg-transparent px-3 py-1 text-xs font-medium text-[var(--feedback-danger)] hover:border-[color-mix(in_srgb,var(--feedback-danger)_45%,transparent)] hover:bg-[var(--surface-danger-soft)] disabled:opacity-50"
                        >
                          {t("revoke")}
                        </ConfirmActionButton>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={staffAssignments}
              rowKey={(assignment) => assignment.id}
              empty={t("noStaffAssignments")}
            />
          )}
        </div>
      </GlassCard>

      <details className="group rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          {t("roleCapabilitiesTitle")}
          <span className="text-xs font-normal text-[var(--text-tertiary)] group-open:hidden">{t("show")}</span>
          <span className="hidden text-xs font-normal text-[var(--text-tertiary)] group-open:inline">{t("hide")}</span>
        </summary>
        <div className="px-5 pb-5 pt-1 grid gap-3">
          {roleCapabilitySections.map((section) => (
            <div
              key={section.title}
              className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4"
            >
              <p className="font-semibold text-[var(--text-primary)]">{section.title}</p>
              <div className="mt-3 grid gap-2.5">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="group rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] xl:col-start-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--bg-sunken)]">
          <span>
            <span className="block text-sm font-semibold text-[var(--text-primary)]">
              {t("trainingPlanDelivery")}
            </span>
            <span className="mt-1 block text-xs text-[var(--text-tertiary)]">
              {t("plansAssisted", {
                plans: coachPlans.length,
                assisted: coachPlans.filter((plan) => plan.aiGenerated).length,
              })}
            </span>
          </span>
          <span className="text-xs font-normal text-[var(--text-tertiary)] group-open:hidden">
            {t("show")}
          </span>
          <span className="hidden text-xs font-normal text-[var(--text-tertiary)] group-open:inline">
            {t("hide")}
          </span>
        </summary>
        <div className="grid gap-3 px-5 pb-5 pt-1">
          {coachPlansState.error ? (
            <ErrorNotice message={coachPlansState.error} />
          ) : coachPlansState.loading && coachPlans.length === 0 ? (
            <EmptyState title={t("loadingCoachingPlans")} />
          ) : coachPlans.length ? (
            coachPlans.slice(0, 6).map((plan) => (
              <div key={plan.id} className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <CompactMark
                      label={formatEnumLabel(plan.status)}
                      tone={plan.status === "ACTIVE" ? "accent" : "amber"}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--text-primary)]">{plan.title}</p>
                      <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                        {t("coachPlanMeta", {
                          type: formatEnumLabel(plan.type),
                          assignments: plan.assignmentCount,
                          date: formatDateTime(plan.updatedAt),
                          assisted: plan.aiGenerated ? ` · ${t("assisted")}` : "",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ConfirmActionButton
                      title={
                        plan.assignmentCount > 0
                          ? t("archiveCoachingPlanTitle")
                          : t("deleteCoachingPlanTitle")
                      }
                      description={
                        plan.assignmentCount > 0
                          ? t("archiveCoachingPlanDescription")
                          : t("deleteCoachingPlanDescription")
                      }
                      confirmLabel={plan.assignmentCount > 0 ? t("archive") : t("delete")}
                      onConfirm={() => deleteCoachPlan(plan)}
                      disabled={formBusy === `coach-plan:${plan.id}:delete`}
                      className="zook-focus rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_26%,transparent)] bg-transparent px-3 py-1 text-xs font-medium text-[var(--feedback-danger)] hover:border-[color-mix(in_srgb,var(--feedback-danger)_45%,transparent)] hover:bg-[var(--surface-danger-soft)] disabled:opacity-50"
                    >
                      {plan.assignmentCount > 0 ? t("archive") : t("delete")}
                    </ConfirmActionButton>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title={t("noCoachingPlans")} />
          )}
          {coachPlans.length > 6 ? (
            <Link
              href="/dashboard/plans"
              className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
            >
              {t("morePlans", { count: coachPlans.length - 6 })}
            </Link>
          ) : null}
        </div>
      </details>
    </div>
  );
}
