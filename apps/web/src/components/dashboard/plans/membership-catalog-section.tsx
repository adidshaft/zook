import { ErrorNotice } from "../operational-shared";
import { useMemo, useState } from "react";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import {
  formatPlanShape,
  membershipPlanTypeLabel,
  type MembershipPlanType,
} from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";
import { PlanFormFields } from "./plan-form-fields";
import type { PlansSectionProps } from "./types";

type MembershipCatalogSectionProps = Pick<
  PlansSectionProps,
  | "membershipPlans"
  | "membershipPlansState"
  | "planForm"
  | "setPlanForm"
  | "planEditForm"
  | "setPlanEditForm"
  | "editingPlanId"
  | "setEditingPlanId"
  | "formError"
  | "formBusy"
  | "createMembershipPlan"
  | "startPlanEdit"
  | "updateMembershipPlan"
  | "deleteMembershipPlan"
>;

export function MembershipCatalogSection({
  membershipPlans,
  membershipPlansState,
  planForm,
  setPlanForm,
  planEditForm,
  setPlanEditForm,
  editingPlanId,
  setEditingPlanId,
  formError,
  formBusy,
  createMembershipPlan,
  startPlanEdit,
  updateMembershipPlan,
  deleteMembershipPlan,
}: MembershipCatalogSectionProps) {
  const [showArchived, setShowArchived] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const visiblePlans = useMemo(
    () => (showArchived ? membershipPlans : membershipPlans.filter((plan) => plan.active)),
    [membershipPlans, showArchived],
  );
  const archivedCount = membershipPlans.filter((plan) => !plan.active).length;

  function statusMark(plan: (typeof membershipPlans)[number]) {
    if (!plan.active) return "!";
    return plan.publicVisible ? "✓" : "•";
  }

  function duplicatePlan(plan: (typeof membershipPlans)[number]) {
    setPlanForm({
      name: `${plan.name} copy`.slice(0, 60),
      type: plan.type as MembershipPlanType,
      priceRupees: (plan.pricePaise / 100).toString(),
      durationDays: plan.durationDays?.toString() ?? "",
      visitLimit: plan.visitLimit?.toString() ?? "",
      description: plan.description ?? "",
      publicVisible: plan.publicVisible,
      active: true,
    });
    setEditingPlanId(null);
  }

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Membership plans"
        title="Membership catalog"
        badge={<Pill>{visiblePlans.length} offers</Pill>}
        action={
          <div className="flex items-center gap-2">
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => setShowArchived((current) => !current)}
            >
              {showArchived ? "Hide archived" : `Show archived${archivedCount ? ` (${archivedCount})` : ""}`}
            </ZookButton>
            <ZookButton
              type="button"
              tone={showCreateForm ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? "Cancel" : "+ New plan"}
            </ZookButton>
          </div>
        }
      />
      <div className="mt-5">
        {membershipPlansState.error ? (
          <ErrorNotice message={membershipPlansState.error} />
        ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
          <EmptyState title="Loading membership offers" />
        ) : (
          <DataTable
            columns={[
              {
                id: "name",
                header: "Plan",
                render: (plan) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{plan.name}</p>
                    <p className="mt-1 truncate text-xs text-white/45">
                      {membershipPlanTypeLabel(plan.type)} · {formatPlanShape(plan)}
                    </p>
                  </div>
                ),
              },
              {
                id: "visibility",
                header: "Visibility",
                render: (plan) => (
                  <div className="flex items-center gap-2">
                    <span
                      aria-label={`${plan.active ? "Active" : "Paused"} · ${
                        plan.publicVisible ? "Visible on join page" : "Hidden from join page"
                      }`}
                      title={`${plan.active ? "Active" : "Paused"} · ${
                        plan.publicVisible ? "Visible on join page" : "Hidden from join page"
                      }`}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${
                        !plan.active
                          ? "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                          : plan.publicVisible
                            ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                            : "border-white/10 bg-white/[0.04] text-white/55"
                      }`}
                    >
                      <span aria-hidden>{statusMark(plan)}</span>
                    </span>
                    <span className="text-xs text-white/45">
                      {plan.publicVisible ? "Join page" : "Private"}
                    </span>
                  </div>
                ),
              },
              {
                id: "price",
                header: "Price",
                align: "right",
                render: (plan) => (
                  <span className="font-medium text-white">{formatInr(plan.pricePaise)}</span>
                ),
              },
              {
                id: "actions",
                header: "Manage",
                align: "right",
                render: (plan) => (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ZookButton
                      type="button"
                      tone={editingPlanId === plan.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() =>
                        editingPlanId === plan.id ? setEditingPlanId(null) : startPlanEdit(plan)
                      }
                    >
                      {editingPlanId === plan.id ? "Close" : "Edit"}
                    </ZookButton>
                  </div>
                ),
              },
            ]}
            rows={visiblePlans}
            rowKey={(plan) => plan.id}
            empty="No plans."
          />
        )}
        {editingPlanId ? (
          <div className="mt-4 grid gap-3 rounded-[20px] border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Edit membership plan</p>
                <p className="mt-1 text-xs text-white/45">Pricing and visibility update after save.</p>
              </div>
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setEditingPlanId(null)}
              >
                Cancel
              </ZookButton>
            </div>
            <PlanFormFields form={planEditForm} setForm={setPlanEditForm} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <details className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <summary className="cursor-pointer list-none text-xs font-semibold text-white/65">
                  More plan actions
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => {
                      const plan = membershipPlans.find((item) => item.id === editingPlanId);
                      if (plan) duplicatePlan(plan);
                    }}
                  >
                    Duplicate
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => {
                      const plan = membershipPlans.find((item) => item.id === editingPlanId);
                      if (plan) void updateMembershipPlan(plan.id, { active: !plan.active });
                    }}
                    disabled={formBusy === `plan:${editingPlanId}`}
                    state={formBusy === `plan:${editingPlanId}` ? "loading" : "idle"}
                  >
                    {membershipPlans.find((item) => item.id === editingPlanId)?.active
                      ? "Archive"
                      : "Restore"}
                  </ZookButton>
                  <ConfirmActionButton
                    title="Delete membership plan?"
                    description="Only plans without subscriptions can be deleted. Archive plans with subscriptions so member history stays intact."
                    confirmLabel="Delete"
                    onConfirm={() => deleteMembershipPlan(editingPlanId)}
                    disabled={formBusy === `plan:${editingPlanId}:delete`}
                    className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                  >
                    Delete
                  </ConfirmActionButton>
                </div>
              </details>
              <ZookButton
                type="button"
                onClick={() => void updateMembershipPlan(editingPlanId)}
                disabled={formBusy === `plan:${editingPlanId}`}
                state={formBusy === `plan:${editingPlanId}` ? "loading" : "idle"}
                className="sm:min-w-32"
              >
                {formBusy === `plan:${editingPlanId}` ? "Saving..." : "Save plan"}
              </ZookButton>
            </div>
          </div>
        ) : null}
        {showCreateForm ? (
          <div className="mt-4 grid gap-3 rounded-[20px] border border-white/10 bg-black/20 p-3">
            <div>
              <p className="font-medium text-white">New membership plan</p>
              <p className="mt-1 text-xs text-white/45">Controls join, sales, and approval flows.</p>
            </div>
            <PlanFormFields form={planForm} setForm={setPlanForm} showShapeHint />
            <ZookButton
              type="button"
              onClick={() => void createMembershipPlan()}
              disabled={formBusy === "plan"}
              state={formBusy === "plan" ? "loading" : "idle"}
              fullWidth
            >
              {formBusy === "plan" ? "Creating..." : "Create plan"}
            </ZookButton>
            {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
