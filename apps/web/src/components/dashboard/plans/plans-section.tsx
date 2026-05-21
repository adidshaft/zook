"use client";

import { CoachingLibrarySection } from "./coaching-library-section";
import { MembershipCatalogSection } from "./membership-catalog-section";
import { PlanGrowthLinks } from "./plan-growth-links";
import type { PlansSectionProps } from "./types";

export function PlansSection(props: PlansSectionProps) {
  return (
    <div className="grid gap-4">
      <MembershipCatalogSection
        membershipPlans={props.membershipPlans}
        membershipPlansState={props.membershipPlansState}
        planForm={props.planForm}
        setPlanForm={props.setPlanForm}
        planEditForm={props.planEditForm}
        setPlanEditForm={props.setPlanEditForm}
        editingPlanId={props.editingPlanId}
        setEditingPlanId={props.setEditingPlanId}
        formError={props.formError}
        formBusy={props.formBusy}
        createMembershipPlan={props.createMembershipPlan}
        startPlanEdit={props.startPlanEdit}
        updateMembershipPlan={props.updateMembershipPlan}
        deleteMembershipPlan={props.deleteMembershipPlan}
      />
      <PlanGrowthLinks
        activeCouponCount={props.activeCouponCount}
        activeOfferCount={props.activeOfferCount}
        referralCodeCount={props.referralCodeCount}
      />
      <CoachingLibrarySection
        coachPlans={props.coachPlans}
        coachPlansState={props.coachPlansState}
      />
    </div>
  );
}

export type { PlanFormState, PlanPatch, PlansSectionProps } from "./types";
