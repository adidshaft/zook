"use client";

import type { Dispatch, SetStateAction } from "react";
import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import {
  formatPlanShape,
  type CoachPlanRow,
  type MembershipPlanRow,
  type MembershipPlanType,
} from "../../dashboard-operational-model";
import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";

export type PlanFormState = {
  name: string;
  type: MembershipPlanType;
  priceRupees: string;
  durationDays: string;
  visitLimit: string;
  description: string;
  publicVisible: boolean;
  active: boolean;
};

type ResourceState = {
  error: string;
  loading: boolean;
};

type PlanPatch = Partial<{
  name: string;
  description?: string;
  type: MembershipPlanType;
  pricePaise: number;
  durationDays?: number;
  visitLimit?: number;
  validityDays?: number;
  publicVisible: boolean;
  active: boolean;
}>;

type PlansSectionProps = {
  membershipPlans: MembershipPlanRow[];
  membershipPlansState: ResourceState;
  coachPlans: CoachPlanRow[];
  coachPlansState: ResourceState;
  planForm: PlanFormState;
  setPlanForm: Dispatch<SetStateAction<PlanFormState>>;
  planEditForm: PlanFormState;
  setPlanEditForm: Dispatch<SetStateAction<PlanFormState>>;
  editingPlanId: string | null;
  setEditingPlanId: Dispatch<SetStateAction<string | null>>;
  formError: string;
  formStatus: string;
  formBusy: string | null;
  createMembershipPlan: () => Promise<void>;
  startPlanEdit: (plan: MembershipPlanRow) => void;
  updateMembershipPlan: (planId: string, patch?: PlanPatch) => Promise<void>;
  deleteMembershipPlan: (planId: string) => Promise<void>;
};

const membershipPlanTypes: MembershipPlanType[] = [
  "HYBRID",
  "DURATION",
  "VISIT_PACK",
  "DATE_RANGE",
  "TRIAL",
];

export function PlansSection({
  membershipPlans,
  membershipPlansState,
  coachPlans,
  coachPlansState,
  planForm,
  setPlanForm,
  planEditForm,
  setPlanEditForm,
  editingPlanId,
  setEditingPlanId,
  formError,
  formStatus,
  formBusy,
  createMembershipPlan,
  startPlanEdit,
  updateMembershipPlan,
  deleteMembershipPlan,
}: PlansSectionProps) {
  return (
    <div className="grid gap-4">
      <GlassCard>
        <SectionHeader
          eyebrow="Membership plans"
          title="Membership catalog"
          description="Plans shown to members, staff, and desk teams."
          badge={<Pill tone="blue">{membershipPlans.length} offers</Pill>}
        />
        <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Create membership plan</p>
              <p className="mt-1 text-xs text-white/45">
                Publishes into join, sales, and approval flows.
              </p>
            </div>
            <Pill tone="lime">Live</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={planForm.name}
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Plan name"
              maxLength={60}
              pattern="^(?!.*\\d{8,}).{1,60}$"
              title="Use 60 characters or fewer and avoid raw numeric IDs."
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <select
              value={planForm.type}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  type: event.target.value as MembershipPlanType,
                }))
              }
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            >
              {membershipPlanTypes.map((type) => (
                <option key={type} value={type} className="bg-black">
                  {formatEnumLabel(type)}
                </option>
              ))}
            </select>
            <input
              value={planForm.priceRupees}
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, priceRupees: event.target.value }))
              }
              placeholder="Price in rupees"
              inputMode="decimal"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={planForm.durationDays}
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, durationDays: event.target.value }))
              }
              placeholder="Duration days"
              inputMode="numeric"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <input
              value={planForm.visitLimit}
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, visitLimit: event.target.value }))
              }
              placeholder="Visit limit"
              inputMode="numeric"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
              Public
              <input
                type="checkbox"
                checked={planForm.publicVisible}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, publicVisible: event.target.checked }))
                }
                className="h-4 w-4 accent-lime-300"
              />
            </label>
          </div>
          <input
            value={planForm.description}
            onChange={(event) =>
              setPlanForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Short public description"
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
          <button
            onClick={() => void createMembershipPlan()}
            disabled={formBusy === "plan"}
            className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {formBusy === "plan" ? "Creating..." : "Create plan"}
          </button>
          {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
          {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
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
                        tone={plan.publicVisible ? "blue" : "neutral"}
                      />
                      <StatusPill
                        value={plan.active ? "Active" : "Paused"}
                        tone={plan.active ? "lime" : "amber"}
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
                      <button
                        onClick={() => startPlanEdit(plan)}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void updateMembershipPlan(plan.id, { active: !plan.active })}
                        disabled={formBusy === `plan:${plan.id}`}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-amber-300/40 hover:text-amber-100 disabled:opacity-50"
                      >
                        {plan.active ? "Archive" : "Restore"}
                      </button>
                      <button
                        onClick={() => void deleteMembershipPlan(plan.id)}
                        disabled={formBusy === `plan:${plan.id}:delete`}
                        className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                      >
                        Delete
                      </button>
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
            <div className="mt-4 grid gap-3 rounded-[24px] border border-lime-300/20 bg-lime-300/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">Edit membership plan</p>
                  <p className="mt-1 text-xs text-white/45">
                    Updates pricing, visibility, and plan structure immediately.
                  </p>
                </div>
                <button
                  onClick={() => setEditingPlanId(null)}
                  className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                >
                  Cancel
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={planEditForm.name}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Plan name"
                  maxLength={60}
                  pattern="^(?!.*\\d{8,}).{1,60}$"
                  title="Use 60 characters or fewer and avoid raw numeric IDs."
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <select
                  value={planEditForm.type}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({
                      ...current,
                      type: event.target.value as MembershipPlanType,
                    }))
                  }
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  {membershipPlanTypes.map((type) => (
                    <option key={type} value={type} className="bg-black">
                      {formatEnumLabel(type)}
                    </option>
                  ))}
                </select>
                <input
                  value={planEditForm.priceRupees}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({
                      ...current,
                      priceRupees: event.target.value,
                    }))
                  }
                  placeholder="Price in rupees"
                  inputMode="decimal"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={planEditForm.durationDays}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({
                      ...current,
                      durationDays: event.target.value,
                    }))
                  }
                  placeholder="Duration days"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={planEditForm.visitLimit}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({ ...current, visitLimit: event.target.value }))
                  }
                  placeholder="Visit limit"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                  Public
                  <input
                    type="checkbox"
                    checked={planEditForm.publicVisible}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({
                        ...current,
                        publicVisible: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-lime-300"
                  />
                </label>
              </div>
              <input
                value={planEditForm.description}
                onChange={(event) =>
                  setPlanEditForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Short public description"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <button
                onClick={() => void updateMembershipPlan(editingPlanId)}
                disabled={formBusy === `plan:${editingPlanId}`}
                className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {formBusy === `plan:${editingPlanId}` ? "Saving..." : "Save plan"}
              </button>
            </div>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Coaching Library"
          title="Workout and advisory plans"
          description="These are the plans trainers are creating and reviewing for members."
          badge={
            <Pill tone="amber">
              {coachPlans.filter((plan) => plan.reviewed === false).length} pending review
            </Pill>
          }
        />
        <div className="mt-5">
          {coachPlansState.error ? (
            <ErrorNotice message={coachPlansState.error} />
          ) : coachPlansState.loading && coachPlans.length === 0 ? (
            <EmptyState
              title="Loading coaching library"
              description="Pulling draft and published plan content."
            />
          ) : (
            <DataTable
              columns={[
                {
                  id: "title",
                  header: "Plan",
                  render: (plan) => (
                    <div>
                      <p className="font-medium text-white">{plan.title}</p>
                      <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                    </div>
                  ),
                },
                {
                  id: "review",
                  header: "Review",
                  render: (plan) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        value={plan.reviewed ? "Reviewed" : "Needs review"}
                        tone={plan.reviewed ? "lime" : "amber"}
                      />
                      {plan.aiGenerated ? <StatusPill value="Assisted" tone="amber" /> : null}
                    </div>
                  ),
                },
                {
                  id: "assignment",
                  header: "Assignments",
                  align: "right",
                  render: (plan) => plan.assignmentCount.toString(),
                },
                {
                  id: "updated",
                  header: "Updated",
                  render: (plan) => formatDateTime(plan.updatedAt),
                },
              ]}
              rows={coachPlans}
              rowKey={(plan) => plan.id}
              empty="No workout or advisory plans are available yet."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
