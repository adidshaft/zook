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
} from "@/components/dashboard/types";
import { parseBranchHoursText } from "./branch-hours-editor";
import { BranchesListCard } from "./branches-list-card";
import { BranchForm } from "./branch-form";

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
  const hasActivePlan = membershipPlans.some((plan) => plan.active);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Branches"
          title="Add a branch"
          badge={<Pill>{branches.length || 1} locations</Pill>}
        />
        <div className="mt-5 grid gap-3">
          {formError ? <ErrorNotice message={formError} /> : null}
          {formStatus ? (
            <p className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm text-blue-50">
              {formStatus}
            </p>
          ) : null}
          
          <BranchForm
            mode="create"
            variant="full"
            form={branchForm}
            setForm={setBranchForm}
            onSubmit={() => void createBranch()}
            formBusy={formBusy === "branch"}
            staffAssignments={staffAssignments}
            staffUsersById={staffUsersById}
          />
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
