"use client";

import { DataTable, EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { formatCompactNumber, formatEnumLabel, formatInr } from "@/lib/format";
import type { AIUsageRow, CoachPlanRow, OrganizationSummary } from "../../dashboard-operational-model";
import { ErrorNotice, formatAiResponseSummary } from "../operational-shared";
import type { LoadingState } from "./types";

export function AiPanel({
  summary,
  aiUsage,
  aiUsageState,
  coachPlans,
  misconfiguredAiCount,
}: {
  summary: OrganizationSummary;
  aiUsage: AIUsageRow[];
  aiUsageState: LoadingState;
  coachPlans: CoachPlanRow[];
  misconfiguredAiCount: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Assistant"
          title="Draft summaries"
          description="Assisted drafts, categories, and review notes for this gym."
          badge={<Pill tone="blue">{aiUsage.length} drafts</Pill>}
        />
        <div className="mt-5">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState
              title="Loading drafts"
              description="Getting the latest assisted drafts for this gym."
            />
          ) : (
            <DataTable
              columns={[
                {
                  id: "summary",
                  header: "Prompt",
                  render: (usage) => (
                    <div>
                      <p className="font-medium text-white">{usage.promptSummary}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatAiResponseSummary(usage.responseSummary)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "shape",
                  header: "Category",
                  render: (usage) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(usage.requestType)} />
                    </div>
                  ),
                },
                {
                  id: "tokens",
                  header: "Detail",
                  align: "right",
                  render: (usage) => (usage.tokenEstimate > 0 ? "Detailed" : "Short"),
                },
                {
                  id: "cost",
                  header: "Cost",
                  align: "right",
                  render: (usage) => formatInr(usage.costEstimatePaise),
                },
              ]}
              rows={aiUsage}
              rowKey={(usage) => usage.id}
              empty="No assistant drafts are available for this gym yet."
            />
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Draft output"
          title="Assisted content"
          description="A quick view of whether assisted work is becoming real coaching output."
        />
        <ReadoutGrid
          className="mt-5"
          columns={1}
          items={[
            {
              label: "Usage this month",
              value: formatCompactNumber(summary.aiUsageThisMonth),
              meta: "Assisted drafts this month",
            },
            {
              label: "Review cues",
              value:
                misconfiguredAiCount > 0 ? `${misconfiguredAiCount} drafts need review` : "Clear",
              meta: "Based on draft review signals",
            },
            {
              label: "Assisted plans",
              value: coachPlans.filter((plan) => plan.aiGenerated).length
                ? `${coachPlans.filter((plan) => plan.aiGenerated).length} plans`
                : "No assisted plans yet",
              meta: "Reviewable training content created so far",
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
