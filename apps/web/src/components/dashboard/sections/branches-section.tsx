"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import type {
  BranchRow,
  MembershipPlanRow,
  StaffAssignmentRow,
  StaffUserRow,
} from "@/components/dashboard/types";
import { parseBranchHoursText } from "./branch-hours-editor";
import { BranchesListCard } from "./branches-list-card";
import { BranchForm } from "./branch-form";
import { Building2, MapPinned, WalletCards } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/use-t";

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
  locationSource?: "MANUAL" | "GOOGLE_PLACE" | "GOOGLE_MAPS_LINK";
  googleMapsUrl?: string;
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
    googleMapsUrl: form.googleMapsUrl?.trim() || undefined,
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const t = useT("branchManagement");
  const scopeItems = [
    { icon: Building2, label: t("scopeGymSelector") },
    { icon: WalletCards, label: t("scopeSubscription") },
    { icon: MapPinned, label: t("scopeMaps") },
  ];

  return (
    <div className="grid gap-4">
      <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {t("subscriptionScopeTitle")}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {scopeItems.map(({ icon: Icon, label }, index) => (
                <span
                  key={label}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                    index === 1
                      ? "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                  }`}
                >
                  <Icon aria-hidden size={14} className="shrink-0" />
                  <span className="min-w-0">{label}</span>
                </span>
              ))}
            </div>
            <details className="group mt-2">
              <summary className="zook-focus inline-flex min-h-8 cursor-pointer list-none items-center rounded-full text-xs font-semibold text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
                {t("learnMore")}
              </summary>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--text-tertiary)]">
                {t("subscriptionScopeBody")}
              </p>
            </details>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <Pill>
              {branches.length || 1}{" "}
              {branches.length === 1 ? t("branchSingular") : t("branchPlural")}
            </Pill>
            {!showCreateForm ? (
              <ZookButton
                type="button"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="w-fit"
              >
                {t("addNewBranch")}
              </ZookButton>
            ) : null}
          </div>
        </div>
      </div>

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

      {showCreateForm ? (
        <GlassCard>
          <SectionHeader
            eyebrow={t("branchPlural")}
            title={t("addBranch")}
            badge={<Pill>{branches.length || 1} {t("locations")}</Pill>}
            action={
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition"
              >
                {t("cancel")}
              </button>
            }
          />
          <div className="mt-5 grid gap-3">
            {formError ? <ErrorNotice message={formError} /> : null}
            {formStatus ? (
              <p className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
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
      ) : branches.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="zook-focus flex items-center justify-between gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
        >
          {t("addNewBranch")}
          <span className="text-xs font-normal text-[var(--text-tertiary)]">
            {t("addNewBranchHint")} →
          </span>
        </button>
      ) : null}
    </div>
  );
}
