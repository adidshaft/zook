"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type {
  BranchRow,
  MembershipPlanRow,
  StaffAssignmentRow,
  StaffUserRow,
} from "../../dashboard-operational-model";
import {
  BranchHoursEditor,
  formatBranchHoursSummary,
  parseBranchHoursText,
} from "./branch-hours-editor";

export type BranchFormState = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  managerId?: string;
  amenitiesText?: string;
  hoursText?: string;
  latitude?: string;
  longitude?: string;
  locationSource?: "MANUAL" | "GOOGLE_PLACE";
  commerceSetup?: "SHARED" | "CUSTOM" | undefined;
  isDefault?: boolean;
  active?: boolean;
};

export function branchFormPayload(form: BranchFormState) {
  const operatingHours = parseBranchHoursText(form.hoursText);
  return {
    name: form.name,
    address: form.address,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    contactPhone: form.contactPhone?.trim() || undefined,
    contactEmail: form.contactEmail?.trim() || undefined,
    whatsappNumber: form.whatsappNumber?.trim() || undefined,
    managerId: form.managerId?.trim() || undefined,
    amenities: form.amenitiesText
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    latitude: form.latitude ? Number(form.latitude) : undefined,
    longitude: form.longitude ? Number(form.longitude) : undefined,
    locationSource: form.latitude && form.longitude ? (form.locationSource ?? "MANUAL") : undefined,
    operatingHours,
    commerceSetup: form.commerceSetup,
    isDefault: form.isDefault,
    active: form.active,
  };
}

function branchSetupSteps(branch: BranchRow, hasReceptionist: boolean, hasBranchPlan: boolean) {
  return [
    { label: "Branch created", done: true },
    { label: "Manager assigned", done: Boolean(branch.managerId) },
    { label: "Working hours set", done: Boolean(branch.operatingHours) },
    { label: "Receptionist invited", done: hasReceptionist },
    { label: "Plans ready", done: hasBranchPlan },
  ];
}

const indianStates = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana", "Jharkhand", "Karnataka",
  "Kerala", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "West Bengal",
];

type BranchesSectionProps = {
  branches: BranchRow[];
  branchesState: {
    error?: string | null;
    loading: boolean;
  };
  branchForm: BranchFormState;
  setBranchForm: Dispatch<SetStateAction<BranchFormState>>;
  branchEditForm: BranchFormState;
  setBranchEditForm: Dispatch<SetStateAction<BranchFormState>>;
  editingBranchId: string | null;
  setEditingBranchId: Dispatch<SetStateAction<string | null>>;
  staffAssignments: StaffAssignmentRow[];
  staffUsersById: Map<string, StaffUserRow>;
  membershipPlans: MembershipPlanRow[];
  formError: string;
  formStatus: string;
  formBusy: string | null;
  createBranch: () => Promise<void>;
  saveBranchEdit: (branch: BranchRow) => Promise<void>;
  startBranchEdit: (branch: BranchRow) => void;
  updateBranch: (branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) => Promise<void>;
  deactivateBranch: (branch: BranchRow) => Promise<void>;
};

export function BranchesSection({
  branches,
  branchesState,
  branchForm,
  setBranchForm,
  branchEditForm,
  setBranchEditForm,
  editingBranchId,
  setEditingBranchId,
  staffAssignments,
  staffUsersById,
  membershipPlans,
  formError,
  formStatus,
  formBusy,
  createBranch,
  saveBranchEdit,
  startBranchEdit,
  updateBranch,
  deactivateBranch,
}: BranchesSectionProps) {
  const managerAssignments = staffAssignments.filter(
    (assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN",
  );
  const receptionistBranchIds = new Set(
    staffAssignments
      .filter((assignment) => assignment.role === "RECEPTIONIST" && assignment.branchId)
      .map((assignment) => assignment.branchId),
  );
  const hasActivePlan = membershipPlans.some((plan) => plan.active);
  const branchFormPinWillResolve = !branchForm.latitude && !branchForm.longitude && branchForm.address && branchForm.city && branchForm.state && branchForm.pincode;

  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition((position) => {
      setBranchForm((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        locationSource: "MANUAL",
      }));
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Branches"
          title="Add a branch"
          description="Set the location, contact number, manager, and working hours members should see."
          badge={
            <Pill tone={branches.length > 1 ? "blue" : "lime"}>
              {branches.length || 1} locations
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {formError ? <ErrorNotice message={formError} /> : null}
          {formStatus ? (
            <p className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
              {formStatus}
            </p>
          ) : null}
          <div className="grid gap-2 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <Pill tone="blue">Step 1 · Location</Pill>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="zook-focus w-fit rounded-full border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8"
            >
              Use current location
            </button>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={branchForm.latitude} onChange={(event) => setBranchForm((current) => ({ ...current, latitude: event.target.value, locationSource: "MANUAL" }))} placeholder="Latitude" inputMode="decimal" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.longitude} onChange={(event) => setBranchForm((current) => ({ ...current, longitude: event.target.value, locationSource: "MANUAL" }))} placeholder="Longitude" inputMode="decimal" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            </div>
            {branchForm.latitude && branchForm.longitude ? (
              <iframe
                title="Branch map pin"
                src={`https://maps.google.com/maps?q=${branchForm.latitude},${branchForm.longitude}&z=15&output=embed`}
                className="h-40 w-full rounded-2xl border border-white/10"
              />
            ) : null}
            {branchFormPinWillResolve ? (
              <p className="text-xs text-lime-100/70">
                The map pin will be resolved from this address when you save.
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={branchForm.name} onChange={(event) => setBranchForm((current) => ({ ...current, name: event.target.value }))} placeholder="Branch name" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <input value={branchForm.address} onChange={(event) => setBranchForm((current) => ({ ...current, address: event.target.value }))} placeholder="Full address" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <input value={branchForm.city} onChange={(event) => setBranchForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <select value={branchForm.state} onChange={(event) => setBranchForm((current) => ({ ...current, state: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
              <option value="" className="bg-black">State</option>
              {indianStates.map((state) => <option key={state} value={state} className="bg-black">{state}</option>)}
            </select>
            <input value={branchForm.pincode} onChange={(event) => setBranchForm((current) => ({ ...current, pincode: event.target.value }))} placeholder="Pincode" inputMode="numeric" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <select value={branchForm.managerId} onChange={(event) => setBranchForm((current) => ({ ...current, managerId: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
              <option value="" className="bg-black">Assign a manager later</option>
              {managerAssignments.map((assignment) => (
                <option key={assignment.userId} value={assignment.userId} className="bg-black">
                  {staffUsersById.get(assignment.userId)?.name ?? staffUsersById.get(assignment.userId)?.email ?? "Team member"}
                </option>
              ))}
            </select>
            <input value={branchForm.contactPhone} onChange={(event) => setBranchForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Branch phone" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <input value={branchForm.contactEmail} onChange={(event) => setBranchForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Branch email" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <input value={branchForm.whatsappNumber} onChange={(event) => setBranchForm((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="WhatsApp number" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            <input value={branchForm.amenitiesText} onChange={(event) => setBranchForm((current) => ({ ...current, amenitiesText: event.target.value }))} placeholder="Amenities, separated by commas" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
          </div>
          <Pill tone="blue">Step 2 · Hours and team</Pill>
          <div className="grid gap-2 rounded-[22px] border border-white/10 bg-black/20 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Pill tone="blue">Step 3 · Plans and products</Pill>
            </div>
            {[
              ["SHARED", "Use current plans and products"],
              ["CUSTOM", "Set separate pricing later"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setBranchForm((current) => ({
                    ...current,
                    commerceSetup: value as "SHARED" | "CUSTOM",
                  }))
                }
                className={`zook-focus rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  branchForm.commerceSetup === value
                    ? "border-lime-300 bg-lime-300/12 text-lime-50"
                    : "border-white/10 bg-black/20 text-white/65 hover:bg-white/8"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <BranchHoursEditor
            value={branchForm.hoursText}
            onChange={(hoursText) => setBranchForm((current) => ({ ...current, hoursText }))}
          />
          <button onClick={() => void createBranch()} disabled={formBusy === "branch"} className="zook-focus min-h-11 w-full rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-60">
            {formBusy === "branch" ? "Adding..." : "Add branch"}
          </button>
        </div>
      </GlassCard>

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
                    <input value={branchEditForm.name} onChange={(event) => setBranchEditForm((current) => ({ ...current, name: event.target.value }))} placeholder="Branch name" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.address} onChange={(event) => setBranchEditForm((current) => ({ ...current, address: event.target.value }))} placeholder="Full address" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.city} onChange={(event) => setBranchEditForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <select value={branchEditForm.state} onChange={(event) => setBranchEditForm((current) => ({ ...current, state: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                        <option value="" className="bg-black">State</option>
                        {indianStates.map((state) => <option key={state} value={state} className="bg-black">{state}</option>)}
                      </select>
                    <input value={branchEditForm.pincode} onChange={(event) => setBranchEditForm((current) => ({ ...current, pincode: event.target.value }))} placeholder="Pincode" inputMode="numeric" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <select value={branchEditForm.managerId} onChange={(event) => setBranchEditForm((current) => ({ ...current, managerId: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                      <option value="" className="bg-black">Assign a manager later</option>
                      {managerAssignments.map((assignment) => (
                        <option key={assignment.userId} value={assignment.userId} className="bg-black">
                          {staffUsersById.get(assignment.userId)?.name ?? staffUsersById.get(assignment.userId)?.email ?? "Team member"}
                        </option>
                      ))}
                    </select>
                    <input value={branchEditForm.contactPhone} onChange={(event) => setBranchEditForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Branch phone" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.contactEmail} onChange={(event) => setBranchEditForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Branch email" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.whatsappNumber} onChange={(event) => setBranchEditForm((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="WhatsApp number" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.amenitiesText} onChange={(event) => setBranchEditForm((current) => ({ ...current, amenitiesText: event.target.value }))} placeholder="Amenities, separated by commas" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.latitude} onChange={(event) => setBranchEditForm((current) => ({ ...current, latitude: event.target.value, locationSource: "MANUAL" }))} placeholder="Latitude" inputMode="decimal" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <input value={branchEditForm.longitude} onChange={(event) => setBranchEditForm((current) => ({ ...current, longitude: event.target.value, locationSource: "MANUAL" }))} placeholder="Longitude" inputMode="decimal" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                  </div>
                  <BranchHoursEditor
                    value={branchEditForm.hoursText}
                    onChange={(hoursText) =>
                      setBranchEditForm((current) => ({ ...current, hoursText }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void saveBranchEdit(branch)} disabled={formBusy === `branch:${branch.id}`} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">Save branch</button>
                    <button onClick={() => setEditingBranchId(null)} className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    {(() => {
                      const steps = branchSetupSteps(
                        branch,
                        receptionistBranchIds.has(branch.id),
                        hasActivePlan,
                      );
                      const doneCount = steps.filter((step) => step.done).length;
                      return doneCount < 4 ? (
                        <Pill tone="amber">Setup incomplete</Pill>
                      ) : null;
                    })()}
                    <p className="font-medium text-white">{branch.name}</p>
                    <p className="mt-1 text-sm text-white/50">{branch.address} · {branch.city}, {branch.state} {branch.pincode}</p>
                    <p className="mt-1 text-xs text-white/45">{formatBranchHoursSummary(branch.operatingHours)}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {[branch.contactPhone, branch.contactEmail, branch.managerId ? "Manager assigned" : null].filter(Boolean).join(" · ") || "Add contact details before opening this branch"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {branchSetupSteps(branch, receptionistBranchIds.has(branch.id), hasActivePlan).map((step) => (
                        <span
                          key={step.label}
                          className={`rounded-full border px-2 py-1 text-[0.68rem] ${
                            step.done
                              ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
                              : "border-white/10 bg-black/20 text-white/45"
                          }`}
                        >
                          {step.done ? "Done: " : "Todo: "}
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusPill value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"} tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"} />
                    <button onClick={() => startBranchEdit(branch)} className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">Edit</button>
                    {!branch.isDefault ? (
                      <button onClick={() => void updateBranch(branch, { isDefault: true, active: true })} disabled={formBusy === `branch:${branch.id}`} className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 disabled:opacity-50">Make default</button>
                    ) : null}
                    {!branch.isDefault && branch.active ? (
                      <button onClick={() => void deactivateBranch(branch)} disabled={formBusy === `branch:${branch.id}:delete`} className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50">Deactivate</button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
          {!branches.length && !branchesState.loading ? (
            <EmptyState title="No branches yet" description="Add the first location to unlock branch-level attendance and stock controls." />
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
