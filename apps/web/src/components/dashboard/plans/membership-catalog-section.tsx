import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { ConfirmActionButton } from "../../confirm-action-button";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import { formatPlanShape } from "@/components/dashboard/types";
import { formatEnumLabel, formatInr } from "@/lib/format";
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
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Membership plans"
        title="Membership catalog"
        description="Plans shown to members, staff, and desk teams."
        badge={<Pill>{membershipPlans.length} offers</Pill>}
      />
      <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-white">Create membership plan</p>
            <p className="mt-1 text-xs text-white/45">
              Publishes into join, sales, and approval flows.
            </p>
          </div>
          <Pill>Catalog</Pill>
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
      <div className="mt-5">
        {membershipPlansState.error ? (
          <ErrorNotice message={membershipPlansState.error} />
        ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
          <EmptyState title="Loading membership offers" description="Loading your plans." />
        ) : (
          <DataTable
            columns={[
              {
                id: "name",
                header: "Plan",
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.name}</p>
                    <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                  </div>
                ),
              },
              {
                id: "shape",
                header: "Structure",
                render: (plan) => formatPlanShape(plan),
              },
              {
                id: "visibility",
                header: "Visibility",
                render: (plan) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      value={plan.publicVisible ? "Public" : "Private"}
                      tone="neutral"
                    />
                    <StatusPill
                      value={plan.active ? "Active" : "Paused"}
                      tone={plan.active ? "blue" : "amber"}
                    />
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
                      tone="ghost"
                      size="sm"
                      onClick={() => startPlanEdit(plan)}
                    >
                      Edit
                    </ZookButton>
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => void updateMembershipPlan(plan.id, { active: !plan.active })}
                      disabled={formBusy === `plan:${plan.id}`}
                      state={formBusy === `plan:${plan.id}` ? "loading" : "idle"}
                    >
                      {plan.active ? "Archive" : "Restore"}
                    </ZookButton>
                    <ConfirmActionButton
                      title="Delete membership plan?"
                      description="Only unused plans can be deleted. Plans with subscriptions should be archived so member history stays intact."
                      confirmLabel="Delete"
                      onConfirm={() => deleteMembershipPlan(plan.id)}
                      disabled={formBusy === `plan:${plan.id}:delete`}
                      className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                    >
                      Delete
                    </ConfirmActionButton>
                  </div>
                ),
              },
            ]}
            rows={membershipPlans}
            rowKey={(plan) => plan.id}
            empty="No membership plans are available yet."
          />
        )}
        {editingPlanId ? (
          <div className="mt-4 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Edit membership plan</p>
                <p className="mt-1 text-xs text-white/45">
                  Updates pricing, visibility, and plan structure immediately.
                </p>
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
            <ZookButton
              type="button"
              onClick={() => void updateMembershipPlan(editingPlanId)}
              disabled={formBusy === `plan:${editingPlanId}`}
              state={formBusy === `plan:${editingPlanId}` ? "loading" : "idle"}
            >
              {formBusy === `plan:${editingPlanId}` ? "Saving..." : "Save plan"}
            </ZookButton>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
