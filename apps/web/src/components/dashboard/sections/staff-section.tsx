"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
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

const roleCapabilitySections = [
  {
    title: "Reception",
    items: [
      "Check in members",
      "Override entry when QR fails",
      "Approve or reject pending entries",
      "Record cash, UPI, card, and bank payments",
      "Verify and fulfill shop pickups",
      "Send one-member desk updates",
    ],
  },
  {
    title: "Admin",
    items: [
      "Manage members and join requests",
      "Manage plans, coupons, and offers",
      "Manage shop products and orders",
      "Send broadcast messages within limits",
      "View reports and activity logs",
      "Manage branches and staff except billing",
    ],
  },
  {
    title: "Owner",
    items: [
      "Manage billing and invoices",
      "Refund payments",
      "Transfer ownership",
      "Modify role permissions",
      "Manage every admin workflow",
    ],
  },
];

export function StaffSection({
  organization,
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
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <GlassCard>
        <div className="mb-5 grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Invite staff</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Invite email sends a sign-in link. Reception users should be tied to one branch;
                admins and trainers can work across assigned gym areas.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              value={staffInvite.email}
              onChange={(event) =>
                setStaffInvite((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="staff@example.com"
              type="email"
              className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
            <SearchableSelect
              label="Role"
              value={staffInvite.role}
              onChange={(role) =>
                setStaffInvite((current) => ({
                  ...current,
                  role: role as StaffRole,
                  branchId: role === "RECEPTIONIST" ? current.branchId : "",
                }))
              }
              options={[
                { value: "TRAINER", label: "Trainer" },
                { value: "RECEPTIONIST", label: "Reception" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
          </div>
          {staffInvite.role === "RECEPTIONIST" ? (
            <SearchableSelect
              label="Assign branch"
              placeholder="Assign branch"
              value={staffInvite.branchId}
              onChange={(branchId) => setStaffInvite((current) => ({ ...current, branchId }))}
              options={branches
                .filter((branch) => branch.active !== false)
                .map((branch) => ({ value: branch.id, label: branch.name }))}
            />
          ) : null}
          <ZookButton
            type="button"
            onClick={() => void inviteStaff()}
            disabled={formBusy === "staff"}
            state={formBusy === "staff" ? "loading" : "idle"}
            fullWidth
          >
            {formBusy === "staff" ? "Inviting..." : "Invite staff"}
          </ZookButton>
          {formError ? <p className="text-sm text-[var(--feedback-danger)]">{formError}</p> : null}
          {formStatus ? <p className="text-sm text-[var(--feedback-success)]">{formStatus}</p> : null}
        </div>
        <SectionHeader
          eyebrow="Team"
          title="Operational roles"
          badge={<Pill>{staffAssignments.length} assignments</Pill>}
        />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          Created in Trainer app.
        </ManagedOn>
        <div className="mt-5">
          {staffState.error ? (
            <ErrorNotice message={staffState.error} />
          ) : staffState.loading && staffAssignments.length === 0 ? (
            <EmptyState title="Loading staff" />
          ) : (
            <DataTable
              columns={[
                {
                  id: "person",
                  header: "Person",
                  render: (assignment) => (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {staffUsersById.get(assignment.userId)?.name ?? "Staff user"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {staffUsersById.get(assignment.userId)?.email ?? assignment.userId}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "role",
                  header: "Role",
                  render: (assignment) =>
                    editingStaffId === assignment.id ? (
                      <div className="grid min-w-[180px] gap-2">
                        <select
                          value={staffRoleDraft}
                          onChange={(event) => setStaffRoleDraft(event.target.value as StaffRole)}
                          className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="TRAINER" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            Trainer
                          </option>
                          <option value="RECEPTIONIST" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            Reception
                          </option>
                          <option value="ADMIN" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            Admin
                          </option>
                        </select>
                        <select
                          value={staffBranchDraft}
                          onChange={(event) => setStaffBranchDraft(event.target.value)}
                          className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            All branches
                          </option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-[var(--text-secondary)]">
                        {formatEnumLabel(assignment.role)}
                      </span>
                    ),
                },
                {
                  id: "branch",
                  header: "Branch",
                  render: (assignment) =>
                    branches.find((branch) => branch.id === assignment.branchId)?.name ??
                    "All branches",
                },
                {
                  id: "contact",
                  header: "Contact",
                  render: (assignment) =>
                    staffUsersById.get(assignment.userId)?.phone ??
                    organization.contactPhone ??
                    "Desk route",
                },
                {
                  id: "created",
                  header: "Assigned",
                  render: (assignment) => formatDate(assignment.createdAt),
                },
                {
                  id: "actions",
                  header: "Manage",
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
                            Save
                          </ZookButton>
                          <ZookButton
                            type="button"
                            tone="ghost"
                            size="sm"
                            onClick={() => setEditingStaffId(null)}
                          >
                            Cancel
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
                          Role
                        </ZookButton>
                      )}
                      {assignment.role !== "OWNER" ? (
                        <ConfirmActionButton
                          title="Revoke staff access?"
                          description="This removes the staff member from this gym. Their historical activity stays in the audit log."
                          confirmLabel="Revoke"
                          onConfirm={() => revokeStaff(assignment.id)}
                          disabled={formBusy === `staff:${assignment.id}:revoke`}
                          className="zook-focus rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_26%,transparent)] bg-transparent px-3 py-1 text-xs font-medium text-[var(--feedback-danger)] hover:border-[color-mix(in_srgb,var(--feedback-danger)_45%,transparent)] hover:bg-[var(--surface-danger-soft)] disabled:opacity-50"
                        >
                          Revoke
                        </ConfirmActionButton>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={staffAssignments}
              rowKey={(assignment) => assignment.id}
              empty="No staff assignments."
            />
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Access"
          title="What each role can do"
        />
        <div className="mt-5 grid gap-3">
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
        <div className="mt-5 rounded-[22px] border border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[var(--surface-accent-soft)] p-4">
          <p className="font-semibold text-[var(--accent-strong)]">Team profile checklist</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Ask every new team member to add their photo, phone number, and display name after
            accepting the invite. This keeps Reception, Trainer, Admin, and Owner records readable.
          </p>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Coach Output"
          title="Plan delivery"
          badge={
            <Pill>
              {coachPlans.filter((plan) => plan.aiGenerated).length} assisted
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {coachPlansState.error ? (
            <ErrorNotice message={coachPlansState.error} />
          ) : coachPlansState.loading && coachPlans.length === 0 ? (
            <EmptyState title="Loading coaching plans" />
          ) : coachPlans.length ? (
            coachPlans.slice(0, 6).map((plan) => (
              <div key={plan.id} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{plan.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {formatEnumLabel(plan.type)} · {plan.assignmentCount} assignments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={formatEnumLabel(plan.status)} />
                    {plan.aiGenerated ? <StatusPill value="Assisted" /> : null}
                    <ConfirmActionButton
                      title={
                        plan.assignmentCount > 0
                          ? "Archive coaching plan?"
                          : "Delete coaching plan?"
                      }
                      description={
                        plan.assignmentCount > 0
                          ? "Assigned plans are archived so member history remains intact."
                          : "This plan will be removed from the training library."
                      }
                      confirmLabel={plan.assignmentCount > 0 ? "Archive" : "Delete"}
                      onConfirm={() => deleteCoachPlan(plan)}
                      disabled={formBusy === `coach-plan:${plan.id}:delete`}
                      className="zook-focus rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_26%,transparent)] bg-transparent px-3 py-1 text-xs font-medium text-[var(--feedback-danger)] hover:border-[color-mix(in_srgb,var(--feedback-danger)_45%,transparent)] hover:bg-[var(--surface-danger-soft)] disabled:opacity-50"
                    >
                      {plan.assignmentCount > 0 ? "Archive" : "Delete"}
                    </ConfirmActionButton>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                  Updated {formatDateTime(plan.updatedAt)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No coaching plans" />
          )}
          {coachPlans.length > 6 ? (
            <Link
              href="/dashboard/plans"
              className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
            >
              {coachPlans.length - 6} more plans →
            </Link>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
