"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type {
  BranchRow,
  CoachPlanRow,
  OrganizationSnapshot,
  StaffAssignmentRow,
  StaffRole,
  StaffUserRow,
} from "../../dashboard-operational-model";
import { formatDate, formatDateTime, formatEnumLabel } from "@/lib/format";

type ResourceState = {
  error: string;
  loading: boolean;
};

type StaffInviteState = {
  email: string;
  role: StaffRole;
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
        <div className="mb-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Invite staff</p>
              <p className="mt-1 text-xs text-white/45">Invites a new team member.</p>
            </div>
            <Pill tone="lime">Invite</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              value={staffInvite.email}
              onChange={(event) =>
                setStaffInvite((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="staff@example.com"
              type="email"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <select
              value={staffInvite.role}
              onChange={(event) =>
                setStaffInvite((current) => ({
                  ...current,
                  role: event.target.value as StaffRole,
                }))
              }
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="TRAINER" className="bg-black">
                Trainer
              </option>
              <option value="RECEPTIONIST" className="bg-black">
                Receptionist
              </option>
              <option value="ADMIN" className="bg-black">
                Admin
              </option>
            </select>
          </div>
          <button
            onClick={() => void inviteStaff()}
            disabled={formBusy === "staff"}
            className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {formBusy === "staff" ? "Inviting..." : "Invite staff"}
          </button>
          {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
          {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
        </div>
        <SectionHeader
          eyebrow="Team"
          title="Operational roles"
          description="Your team and their roles."
          badge={<Pill tone="blue">{staffAssignments.length} assignments</Pill>}
        />
        <div className="mt-5">
          {staffState.error ? (
            <ErrorNotice message={staffState.error} />
          ) : staffState.loading && staffAssignments.length === 0 ? (
            <EmptyState
              title="Loading staff"
              description="Pulling role assignments for this organization."
            />
          ) : (
            <DataTable
              columns={[
                {
                  id: "person",
                  header: "Person",
                  render: (assignment) => (
                    <div>
                      <p className="font-medium text-white">
                        {staffUsersById.get(assignment.userId)?.name ?? "Staff user"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
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
                          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="TRAINER" className="bg-black">
                            Trainer
                          </option>
                          <option value="RECEPTIONIST" className="bg-black">
                            Receptionist
                          </option>
                          <option value="ADMIN" className="bg-black">
                            Admin
                          </option>
                        </select>
                        <select
                          value={staffBranchDraft}
                          onChange={(event) => setStaffBranchDraft(event.target.value)}
                          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="" className="bg-black">
                            All branches
                          </option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id} className="bg-black">
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-white/72">
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
                          <button
                            onClick={() => void updateStaffRole(assignment.id)}
                            disabled={formBusy === `staff:${assignment.id}`}
                            className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStaffId(null)}
                            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingStaffId(assignment.id);
                            setStaffRoleDraft(assignment.role as StaffRole);
                            setStaffBranchDraft(assignment.branchId ?? "");
                          }}
                          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                        >
                          Role
                        </button>
                      )}
                      {assignment.role !== "OWNER" ? (
                        <button
                          onClick={() => void revokeStaff(assignment.id)}
                          disabled={formBusy === `staff:${assignment.id}:revoke`}
                          className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={staffAssignments}
              rowKey={(assignment) => assignment.id}
              empty="No staff assignments are recorded beyond members."
            />
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Coach Output"
          title="Plan production"
          description="Trainer-written and assisted plans appear here so owners can review the delivery load."
          badge={
            <Pill tone="amber">
              {coachPlans.filter((plan) => plan.aiGenerated).length} assisted
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {coachPlansState.error ? (
            <ErrorNotice message={coachPlansState.error} />
          ) : coachPlansState.loading && coachPlans.length === 0 ? (
            <EmptyState
              title="Loading coaching plans"
              description="Pulling the current training library."
            />
          ) : coachPlans.length ? (
            coachPlans.slice(0, 6).map((plan) => (
              <div key={plan.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {formatEnumLabel(plan.type)} · {plan.assignmentCount} assignments
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={formatEnumLabel(plan.status)} />
                    {plan.aiGenerated ? <StatusPill value="Assisted" tone="amber" /> : null}
                    <button
                      onClick={() => void deleteCoachPlan(plan)}
                      disabled={formBusy === `coach-plan:${plan.id}:delete`}
                      className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 disabled:opacity-50"
                    >
                      {plan.assignmentCount > 0 ? "Archive" : "Delete"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/40">
                  Updated {formatDateTime(plan.updatedAt)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No coaching plans yet"
              description="Trainers have not published any plans for this org."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
