"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type {
  BranchRow,
  StaffAssignmentRow,
  StaffUserRow,
} from "@/components/dashboard/types";
import { BranchHoursEditor, formatBranchHoursSummary } from "./branch-hours-editor";
import type { BranchFormState } from "./branches-section";
import { indianStates } from "./branch-states";

function branchSetupSteps(branch: BranchRow, hasReceptionist: boolean, hasBranchPlan: boolean) {
  return [
    { label: "Branch created", done: true },
    { label: "Manager assigned", done: Boolean(branch.managerId) },
    { label: "Working hours set", done: Boolean(branch.operatingHours) },
    { label: "Reception assigned", done: hasReceptionist },
    { label: "Plans ready", done: hasBranchPlan },
  ];
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
  const managerAssignments = staffAssignments.filter(
    (assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN",
  );
  const receptionistBranchIds = new Set(
    staffAssignments
      .filter((assignment) => assignment.role === "RECEPTIONIST" && assignment.branchId)
      .map((assignment) => assignment.branchId),
  );

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Locations"
        title="Branch list"
        description="Keep addresses, managers, and active branches ready for member check-ins and staff work."
        badge={<Pill tone="blue">{branches.filter((branch) => branch.active).length} active</Pill>}
      />
      <div className="mt-5 grid gap-3">
        {branchesState.error ? <ErrorNotice message={branchesState.error} /> : null}
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            {editingBranchId === branch.id ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={branchEditForm.name}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Branch name"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.address}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="Full address"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.city}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({ ...current, city: event.target.value }))
                    }
                    placeholder="City"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <select
                    value={branchEditForm.state}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({ ...current, state: event.target.value }))
                    }
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="" className="bg-black">
                      State
                    </option>
                    {indianStates.map((state) => (
                      <option key={state} value={state} className="bg-black">
                        {state}
                      </option>
                    ))}
                  </select>
                  <input
                    value={branchEditForm.pincode}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({ ...current, pincode: event.target.value }))
                    }
                    placeholder="Pincode"
                    inputMode="numeric"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <select
                    value={branchEditForm.managerId}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        managerId: event.target.value,
                      }))
                    }
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="" className="bg-black">
                      Assign a manager later
                    </option>
                    {managerAssignments.map((assignment) => (
                      <option
                        key={assignment.userId}
                        value={assignment.userId}
                        className="bg-black"
                      >
                        {staffUsersById.get(assignment.userId)?.name ??
                          staffUsersById.get(assignment.userId)?.email ??
                          "Team member"}
                      </option>
                    ))}
                  </select>
                  <input
                    value={branchEditForm.contactPhone}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        contactPhone: event.target.value,
                      }))
                    }
                    placeholder="Branch phone"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.contactEmail}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        contactEmail: event.target.value,
                      }))
                    }
                    placeholder="Branch email"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.whatsappNumber}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        whatsappNumber: event.target.value,
                      }))
                    }
                    placeholder="WhatsApp number"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.amenitiesText}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        amenitiesText: event.target.value,
                      }))
                    }
                    placeholder="Amenities, separated by commas"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.latitude}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        latitude: event.target.value,
                        locationSource: "MANUAL",
                      }))
                    }
                    placeholder="Latitude"
                    inputMode="decimal"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={branchEditForm.longitude}
                    onChange={(event) =>
                      setBranchEditForm((current) => ({
                        ...current,
                        longitude: event.target.value,
                        locationSource: "MANUAL",
                      }))
                    }
                    placeholder="Longitude"
                    inputMode="decimal"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
                <BranchHoursEditor
                  value={branchEditForm.hoursText}
                  onChange={(hoursText) =>
                    setBranchEditForm((current) => ({ ...current, hoursText }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <ZookButton
                    type="button"
                    size="sm"
                    onClick={() => void saveBranchEdit(branch)}
                    disabled={formBusy === `branch:${branch.id}`}
                    state={formBusy === `branch:${branch.id}` ? "loading" : "idle"}
                  >
                    Save branch
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => setEditingBranchId(null)}
                  >
                    Cancel
                  </ZookButton>
                </div>
              </div>
            ) : (
              <BranchSummaryRow
                branch={branch}
                formBusy={formBusy}
                hasActivePlan={hasActivePlan}
                hasReceptionist={receptionistBranchIds.has(branch.id)}
                onDeactivate={deactivateBranch}
                onEdit={startBranchEdit}
                onUpdate={updateBranch}
              />
            )}
          </div>
        ))}
        {!branches.length && !branchesState.loading ? (
          <EmptyState
            title="No branches yet"
            description="Add the first location to unlock branch-level attendance and stock controls."
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
  onDeactivate,
  onEdit,
  onUpdate,
}: {
  branch: BranchRow;
  formBusy: string | null;
  hasActivePlan: boolean;
  hasReceptionist: boolean;
  onDeactivate: (branch: BranchRow) => Promise<void>;
  onEdit: (branch: BranchRow) => void;
  onUpdate: (branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) => Promise<void>;
}) {
  const steps = branchSetupSteps(branch, hasReceptionist, hasActivePlan);
  const doneCount = steps.filter((step) => step.done).length;
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        {doneCount < 4 ? <Pill tone="amber">Setup incomplete</Pill> : null}
        <p className="font-medium text-white">{branch.name}</p>
        <p className="mt-1 text-sm text-white/50">
          {branch.address} · {branch.city}, {branch.state} {branch.pincode}
        </p>
        <p className="mt-1 text-xs text-white/45">
          {formatBranchHoursSummary(branch.operatingHours)}
        </p>
        <p className="mt-1 text-xs text-white/40">
          {[branch.contactPhone, branch.contactEmail, branch.managerId ? "Manager assigned" : null]
            .filter(Boolean)
            .join(" · ") || "Add contact details before opening this branch"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((step) => (
            <span
              key={step.label}
              className={`rounded-full border px-2 py-1 text-[0.68rem] ${step.done ? "border-lime-300/30 bg-lime-300/10 text-lime-100" : "border-white/10 bg-black/20 text-white/45"}`}
            >
              {step.done ? "Done: " : "Todo: "}
              {step.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <StatusPill
          value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"}
          tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"}
        />
        <ZookButton
          type="button"
          tone="ghost"
          size="sm"
          onClick={() => onEdit(branch)}
        >
          Edit
        </ZookButton>
        {!branch.isDefault ? (
          <ConfirmActionButton
            title="Make this the primary location?"
            description="New attendance, QR displays, and operational defaults will use this location. Existing data stays intact."
            confirmLabel="Make primary"
            onConfirm={() => onUpdate(branch, { isDefault: true, active: true })}
            disabled={formBusy === `branch:${branch.id}`}
            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 disabled:opacity-50"
          >
            Make default
          </ConfirmActionButton>
        ) : null}
        {!branch.isDefault && branch.active ? (
          <ConfirmActionButton
            title="Deactivate branch?"
            description="Existing attendance, payments, and history stay intact. The branch stops appearing in active operational flows."
            confirmLabel="Deactivate"
            onConfirm={() => onDeactivate(branch)}
            disabled={formBusy === `branch:${branch.id}:delete`}
            className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50"
          >
            Deactivate
          </ConfirmActionButton>
        ) : null}
      </div>
    </div>
  );
}
