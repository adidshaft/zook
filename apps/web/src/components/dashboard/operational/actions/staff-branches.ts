import { webApiFetch } from "@/lib/api-client";
import {
  branchFormPayload,
  type BranchFormState,
} from "../../sections/branches-section";
import { normalizeBranchHours, serializeBranchHours } from "../../sections/branch-hours-editor";
import { type BranchRow, type CoachPlanRow } from "../../../dashboard-operational-model";
import { createEmptyStaffInvite, type DashboardOperationalState } from "../controller-state";
import { type DashboardOperationalResources } from "../controller-resources";

export function createStaffBranchesActions({
  orgId,
  state,
  resources,
}: {
  orgId: string;
  state: DashboardOperationalState;
  resources: DashboardOperationalResources;
}) {
  async function inviteStaff() {
    try {
      state.setFormBusy("staff");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/invite`, {
        method: "POST",
        body: state.staffInvite,
      });
      state.setStaffInvite(createEmptyStaffInvite());
      resources.staffState.reload();
      state.setFormStatus("Staff invite created.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to invite staff.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function updateStaffRole(assignmentId: string) {
    try {
      state.setFormBusy(`staff:${assignmentId}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/${assignmentId}`, {
        method: "PATCH",
        body: { role: state.staffRoleDraft, branchId: state.staffBranchDraft || null },
      });
      state.setEditingStaffId(null);
      resources.staffState.reload();
      state.setFormStatus("Staff role updated.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update staff role.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function revokeStaff(assignmentId: string) {
    if (!window.confirm("Revoke this staff member's access to the gym?")) {
      return;
    }
    try {
      state.setFormBusy(`staff:${assignmentId}:revoke`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/${assignmentId}`, { method: "DELETE" });
      resources.staffState.reload();
      state.setFormStatus("Staff access revoked.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to revoke staff access.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function deleteCoachPlan(plan: CoachPlanRow) {
    if (
      !window.confirm(
        "Archive or delete this coaching plan? Assigned plans are archived to keep member history intact.",
      )
    ) {
      return;
    }
    try {
      state.setFormBusy(`coach-plan:${plan.id}:delete`);
      state.setFormError("");
      state.setFormStatus("");
      const payload = await webApiFetch<{ archived?: boolean }>(
        `/api/orgs/${orgId}/plans/${plan.id}`,
        { method: "DELETE" },
      );
      resources.coachPlansState.reload();
      state.setFormStatus(payload.archived ? "Coaching plan archived." : "Coaching plan deleted.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to remove coaching plan.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  async function createBranch() {
    try {
      state.setFormBusy("branch");
      state.setFormError("");
      state.setFormStatus("");
      const payload = await webApiFetch<{ warnings?: string[] }>(`/api/orgs/${orgId}/branches`, {
        method: "POST",
        body: branchFormPayload(state.branchForm),
      });
      state.setBranchForm(state.emptyBranchForm);
      resources.branchesState.reload();
      state.setFormStatus(
        payload.warnings?.length ? `Branch created. ${payload.warnings.join(" ")}` : "Branch created.",
      );
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to create branch.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function updateBranch(branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) {
    try {
      state.setFormBusy(`branch:${branch.id}`);
      state.setFormError("");
      state.setFormStatus("");
      const payload = await webApiFetch<{ warnings?: string[] }>(`/api/orgs/${orgId}/branches/${branch.id}`, {
        method: "PATCH",
        body:
          "amenitiesText" in patch || "hoursText" in patch
            ? branchFormPayload(patch as BranchFormState)
            : patch,
      });
      resources.branchesState.reload();
      state.setFormStatus(
        payload.warnings?.length ? `Branch updated. ${payload.warnings.join(" ")}` : "Branch updated.",
      );
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update branch.");
    } finally {
      state.setFormBusy(null);
    }
  }

  function startBranchEdit(branch: BranchRow) {
    state.setEditingBranchId(branch.id);
    state.setBranchEditForm({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      contactPhone: branch.contactPhone ?? "",
      contactEmail: branch.contactEmail ?? "",
      whatsappNumber: branch.whatsappNumber ?? "",
      managerId: branch.managerId ?? "",
      amenitiesText: branch.amenities?.join(", ") ?? "",
      hoursText: serializeBranchHours(normalizeBranchHours(branch.operatingHours)),
      latitude: branch.latitude ? String(branch.latitude) : "",
      longitude: branch.longitude ? String(branch.longitude) : "",
      locationSource: branch.locationSource === "GOOGLE_PLACE" ? "GOOGLE_PLACE" : "MANUAL",
      commerceSetup: "SHARED",
      isDefault: branch.isDefault,
    });
    state.setFormError("");
    state.setFormStatus("");
  }

  async function saveBranchEdit(branch: BranchRow) {
    await updateBranch(branch, state.branchEditForm);
    state.setEditingBranchId(null);
  }

  async function deactivateBranch(branch: BranchRow) {
    if (!window.confirm("Deactivate this branch? Existing history stays intact.")) {
      return;
    }
    try {
      state.setFormBusy(`branch:${branch.id}:delete`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/branches/${branch.id}`, { method: "DELETE" });
      resources.branchesState.reload();
      state.setFormStatus("Branch deactivated.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to deactivate branch.");
    } finally {
      state.setFormBusy(null);
    }
  }

  return {
    inviteStaff,
    updateStaffRole,
    revokeStaff,
    deleteCoachPlan,
    createBranch,
    updateBranch,
    startBranchEdit,
    saveBranchEdit,
    deactivateBranch,
  };
}
