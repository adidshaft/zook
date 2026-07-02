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
import { useT } from "@/lib/use-t";

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
  const t = useT("ai");
  const responseSummaryLabels = {
    noResponseSummary: t("noResponseSummary"),
    dayPlan: (count: number) => t("dayPlan", { count }),
  };
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
      setDraftStatus(t("writePromptBeforeSaving"));
      return;
    }
    setDraftBusy(true);
    setDraftStatus("");
    try {
      await webApiFetch("/api/ai/chat", {
        method: "POST",
        body: { orgId, prompt: trimmedPrompt },
        feedback: { success: t("assistantDraftSavedShort"), error: t("unableSaveDraft") },
      });
      setPrompt("");
      setDraftStatus(t("assistantDraftSaved"));
      aiUsageState.reload?.();
    } catch (error) {
      setDraftStatus(error instanceof Error ? error.message : t("unableSaveDraft"));
    } finally {
      setDraftBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader eyebrow={t("assistantEyebrow")} title={t("assistantActivityTitle")} />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          {t("managedOnTrainerMobile")}
        </ManagedOn>
        <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
          <label className="grid gap-2 text-sm font-medium text-[var(--text-secondary)]">
            {t("assistantPrompt")}
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder={t("promptPlaceholder")}
              className="zook-focus min-h-28 resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("activityLogHelp")}
            </p>
            <ZookButton
              type="button"
              size="sm"
              onClick={() => void saveDraft()}
              disabled={draftBusy}
              state={draftBusy ? "loading" : "idle"}
            >
              {t("saveDraft")}
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
            <EmptyState title={t("loadingAssistantDrafts")} />
          ) : (
            <DataTable
              columns={[
                {
                  id: "summary",
                  header: t("prompt"),
                  render: (usage) => (
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {usage.promptSummary}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {formatAiResponseSummary(usage.responseSummary, responseSummaryLabels)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "shape",
                  header: t("category"),
                  render: (usage) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(usage.requestType)} />
                    </div>
                  ),
                },
                {
                  id: "tokens",
                  header: t("detail"),
                  align: "right",
                  render: (usage) => (usage.tokenEstimate > 0 ? t("detailed") : t("short")),
                },
                {
                  id: "cost",
                  header: t("cost"),
                  align: "right",
                  render: (usage) => formatInr(usage.costEstimatePaise),
                },
                {
                  id: "details",
                  header: t("details"),
                  align: "right",
                  render: (usage) => (
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => setSelectedDraftId(usage.id)}
                    >
                      {t("view")}
                    </ZookButton>
                  ),
                },
              ]}
              rows={aiUsage}
              rowKey={(usage) => usage.id}
              empty={t("noDrafts")}
            />
          )}
        </div>
        {selectedDraft ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label={t("assistantDraftDetail")}
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {t("draftDetail")}
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
                {t("close")}
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>{formatAiResponseSummary(selectedDraft.responseSummary, responseSummaryLabels)}</p>
              <p>
                {t("draftMetadata", {
                  category: formatEnumLabel(selectedDraft.requestType),
                  cost: formatInr(selectedDraft.costEstimatePaise),
                })}
              </p>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <SectionHeader eyebrow={t("draftOutput")} title={t("launchReadiness")} />
        <ReadoutGrid
          className="mt-5"
          columns={1}
          items={[
            {
              label: t("usageThisMonth"),
              value: formatCompactNumber(summary.aiUsageThisMonth),
              meta: t("assistedDraftsThisMonth"),
            },
            {
              label: t("reviewCues"),
              value:
                misconfiguredAiCount > 0
                  ? t("draftsNeedReview", { count: misconfiguredAiCount })
                  : t("clear"),
              meta: t("basedOnReviewSignals"),
            },
            {
              label: t("assistedPlans"),
              value: coachPlans.filter((plan) => plan.aiGenerated).length
                ? t("planCount", { count: coachPlans.filter((plan) => plan.aiGenerated).length })
                : t("noAssistedPlans"),
              meta: t("trainingContentCreated"),
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
