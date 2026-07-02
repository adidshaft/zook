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
import { useT } from "@/lib/use-t";

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
  const t = useT("members");

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("membershipPlans")}
        title={t("membershipPlanLadder")}
        badge={<Pill>{t("plansCount", { count: membershipPlans.length })}</Pill>}
      />
      <div className="mt-5">
        {membershipPlansState.error ? (
          <ErrorNotice message={membershipPlansState.error} />
        ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
          <EmptyState title={t("loadingPlanLadder")} />
        ) : (
          <DataTable
            columns={[
              {
                id: "plan",
                header: t("plan"),
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
                header: t("shape"),
                render: (plan) => formatPlanShape(plan),
              },
              {
                id: "price",
                header: t("price"),
                align: "right",
                render: (plan) => (
                  <span className="font-medium text-white">{formatInr(plan.pricePaise)}</span>
                ),
              },
              {
                id: "state",
                header: t("state"),
                render: (plan) => (
                  <div>
                    <StatusPill
                      value={plan.active ? t("active") : t("statusPaused")}
                      tone={plan.active ? "blue" : "amber"}
                    />
                    <p className="mt-1 text-xs text-white/45">
                      {plan.publicVisible ? t("visibleJoinPage") : t("hiddenJoinPage")}
                    </p>
                  </div>
                ),
              },
            ]}
            rows={membershipPlans}
            rowKey={(plan) => plan.id}
            empty={t("noPlans")}
          />
        )}
      </div>
    </GlassCard>
  );
}
