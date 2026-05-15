"use client";

import { ErrorNotice } from "../../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import {
  formatPlanShape,
  type MembershipPlanRow,
} from "../../../dashboard-operational-model";
import { formatEnumLabel, formatInr } from "@/lib/format";

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
        eyebrow="Membership setup"
        title="Membership plan ladder"
        description="Use the live pricing ladder below to see which plans are public, how they are shaped, and which ones are currently active."
        badge={<Pill tone="blue">{membershipPlans.length} plans</Pill>}
      />
      <div className="mt-5">
        {membershipPlansState.error ? (
          <ErrorNotice message={membershipPlansState.error} />
        ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
          <EmptyState
            title="Loading plan ladder"
            description="Pulling the latest membership plans for this organization."
          />
        ) : (
          <DataTable
            columns={[
              {
                id: "plan",
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
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      value={plan.active ? "Active" : "Paused"}
                      tone={plan.active ? "lime" : "amber"}
                    />
                    <StatusPill
                      value={plan.publicVisible ? "Public" : "Private"}
                      tone={plan.publicVisible ? "blue" : "neutral"}
                    />
                  </div>
                ),
              },
            ]}
            rows={membershipPlans}
            rowKey={(plan) => plan.id}
            empty="No membership plans are available yet."
          />
        )}
      </div>
    </GlassCard>
  );
}
