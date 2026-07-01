"use client";

import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import {
  formatPlanShape,
  membershipPlanTypeLabel,
  type MembershipPlanRow,
} from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";

type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

export function MembershipPlanLadder({
  membershipPlans,
  membershipPlansState,
}: {
  membershipPlans: MembershipPlanRow[];
  membershipPlansState: ResourceState<{ plans: MembershipPlanRow[] }>;
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Membership plans"
        title="Membership plan ladder"
        badge={<Pill>{membershipPlans.length} plans</Pill>}
      />
      <div className="mt-5">
        {membershipPlansState.error ? (
          <ErrorNotice message={membershipPlansState.error} />
        ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
          <EmptyState title="Loading plan ladder" />
        ) : (
          <DataTable
            columns={[
              {
                id: "plan",
                header: "Plan",
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {membershipPlanTypeLabel(plan.type)}
                    </p>
                  </div>
                ),
              },
              {
                id: "shape",
                header: "Shape",
                render: (plan) => formatPlanShape(plan),
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
                id: "state",
                header: "State",
                render: (plan) => (
                  <div>
                    <StatusPill
                      value={plan.active ? "Active" : "Paused"}
                      tone={plan.active ? "blue" : "amber"}
                    />
                    <p className="mt-1 text-xs text-white/45">
                      {plan.publicVisible ? "Visible on join page" : "Hidden from join page"}
                    </p>
                  </div>
                ),
              },
            ]}
            rows={membershipPlans}
            rowKey={(plan) => plan.id}
            empty="No plans."
          />
        )}
      </div>
    </GlassCard>
  );
}
