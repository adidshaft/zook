"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { ZookButton } from "../../zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatCompactNumber, formatEnumLabel, formatInr } from "@/lib/format";
import type { AIUsageRow, CoachPlanRow, OrganizationSummary } from "@/components/dashboard/types";
import { ErrorNotice, formatAiResponseSummary } from "../operational-shared";
import type { LoadingState } from "./types";

export function AiPanel({
  orgId,
  summary,
  aiUsage,
  aiUsageState,
  coachPlans,
  misconfiguredAiCount,
}: {
  orgId: string;
  summary: OrganizationSummary;
  aiUsage: AIUsageRow[];
  aiUsageState: LoadingState;
  coachPlans: CoachPlanRow[];
  misconfiguredAiCount: number;
}) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const selectedDraft = useMemo(
    () => aiUsage.find((usage) => usage.id === selectedDraftId) ?? null,
    [aiUsage, selectedDraftId],
  );

  async function saveDraft() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setDraftStatus("Write a prompt before saving a draft.");
      return;
    }
    setDraftBusy(true);
    setDraftStatus("");
    try {
      await webApiFetch("/api/ai/chat", {
        method: "POST",
        body: { orgId, prompt: trimmedPrompt },
        feedback: { success: "Assistant draft saved.", error: "Unable to save draft." },
      });
      setPrompt("");
      setDraftStatus("Assistant draft saved.");
      aiUsageState.reload?.();
    } catch (error) {
      setDraftStatus(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader eyebrow="Assistant" title="AI assistant activity" />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          Draft creation lives in trainer mobile workflows; owner web keeps the activity log.
        </ManagedOn>
        <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
          <label className="grid gap-2 text-sm font-medium text-[var(--text-secondary)]">
            Assistant prompt
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Draft a retention note, renewal reminder, or staff follow-up."
              className="zook-focus min-h-28 resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-tertiary)]">
              Saves to the same assistant activity log used by trainer workflows.
            </p>
            <ZookButton
              type="button"
              size="sm"
              onClick={() => void saveDraft()}
              disabled={draftBusy}
              state={draftBusy ? "loading" : "idle"}
            >
              Save draft
            </ZookButton>
          </div>
          {draftStatus ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{draftStatus}</p>
          ) : null}
        </div>
        <div className="mt-5">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState title="Loading assistant drafts" />
          ) : (
            <DataTable
              columns={[
                {
                  id: "summary",
                  header: "Prompt",
                  render: (usage) => (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {usage.promptSummary}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
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
                {
                  id: "details",
                  header: "Details",
                  align: "right",
                  render: (usage) => (
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => setSelectedDraftId(usage.id)}
                    >
                      View
                    </ZookButton>
                  ),
                },
              ]}
              rows={aiUsage}
              rowKey={(usage) => usage.id}
              empty="No drafts."
            />
          )}
        </div>
        {selectedDraft ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Assistant draft detail"
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Draft detail
                </p>
                <p className="mt-1 font-medium text-[var(--text-primary)]">
                  {selectedDraft.promptSummary}
                </p>
              </div>
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setSelectedDraftId(null)}
              >
                Close
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>{formatAiResponseSummary(selectedDraft.responseSummary)}</p>
              <p>
                Category: {formatEnumLabel(selectedDraft.requestType)} · Cost:{" "}
                {formatInr(selectedDraft.costEstimatePaise)}
              </p>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <SectionHeader eyebrow="Draft output" title="Launch readiness" />
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
                : "No assisted plans",
              meta: "Training content created",
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
