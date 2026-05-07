"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type {
  BranchRow,
  MembershipPlanRow,
  StaffAssignmentRow,
  StaffUserRow,
} from "../../dashboard-operational-model";
import { BranchHoursEditor, parseBranchHoursText } from "./branch-hours-editor";
import { BranchesListCard } from "./branches-list-card";
import { indianStates } from "./branch-states";

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
  const hasActivePlan = membershipPlans.some((plan) => plan.active);
  const branchFormPinWillResolve =
    !branchForm.latitude &&
    !branchForm.longitude &&
    branchForm.address &&
    branchForm.city &&
    branchForm.state &&
    branchForm.pincode;

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
              <input
                value={branchForm.latitude}
                onChange={(event) =>
                  setBranchForm((current) => ({
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
                value={branchForm.longitude}
                onChange={(event) =>
                  setBranchForm((current) => ({
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
            <input
              value={branchForm.name}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Branch name"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={branchForm.address}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Full address"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={branchForm.city}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, city: event.target.value }))
              }
              placeholder="City"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <select
              value={branchForm.state}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, state: event.target.value }))
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
              value={branchForm.pincode}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, pincode: event.target.value }))
              }
              placeholder="Pincode"
              inputMode="numeric"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <select
              value={branchForm.managerId}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, managerId: event.target.value }))
              }
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="" className="bg-black">
                Assign a manager later
              </option>
              {managerAssignments.map((assignment) => (
                <option key={assignment.userId} value={assignment.userId} className="bg-black">
                  {staffUsersById.get(assignment.userId)?.name ??
                    staffUsersById.get(assignment.userId)?.email ??
                    "Team member"}
                </option>
              ))}
            </select>
            <input
              value={branchForm.contactPhone}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, contactPhone: event.target.value }))
              }
              placeholder="Branch phone"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={branchForm.contactEmail}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, contactEmail: event.target.value }))
              }
              placeholder="Branch email"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={branchForm.whatsappNumber}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, whatsappNumber: event.target.value }))
              }
              placeholder="WhatsApp number"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={branchForm.amenitiesText}
              onChange={(event) =>
                setBranchForm((current) => ({ ...current, amenitiesText: event.target.value }))
              }
              placeholder="Amenities, separated by commas"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
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
          <button
            onClick={() => void createBranch()}
            disabled={formBusy === "branch"}
            className="zook-focus min-h-11 w-full rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {formBusy === "branch" ? "Adding..." : "Add branch"}
          </button>
        </div>
      </GlassCard>

      <BranchesListCard
        branches={branches}
        branchesState={branchesState}
        branchEditForm={branchEditForm}
        setBranchEditForm={setBranchEditForm}
        editingBranchId={editingBranchId}
        setEditingBranchId={setEditingBranchId}
        staffAssignments={staffAssignments}
        staffUsersById={staffUsersById}
        hasActivePlan={hasActivePlan}
        formBusy={formBusy}
        saveBranchEdit={saveBranchEdit}
        startBranchEdit={startBranchEdit}
        updateBranch={updateBranch}
        deactivateBranch={deactivateBranch}
      />
    </div>
  );
}
