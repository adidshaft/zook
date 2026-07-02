"use client";

import { useMemo, useState } from "react";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { ZookButton } from "../../zook-button";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import type { AIUsageRow, AuditLogRow } from "@/components/dashboard/types";
import {
  CsvExportButton,
  ErrorNotice,
  LoadMoreButton,
  formatAiResponseSummary,
} from "../operational-shared";
import type { LoadingState, PagedState } from "./types";
import { useT } from "@/lib/use-t";

export function AuditPanel({
  orgId,
  auditLogs,
  auditLogsState,
  auditLogCount,
  aiUsage,
  aiUsageState,
  misconfiguredAiCount,
}: {
  orgId: string;
  auditLogs: AuditLogRow[];
  auditLogsState: PagedState;
  auditLogCount: number;
  aiUsage: AIUsageRow[];
  aiUsageState: LoadingState;
  misconfiguredAiCount: number;
}) {
  const t = useT("audit");
  const responseSummaryLabels = {
    noResponseSummary: t("noResponseSummary"),
    dayPlan: (count: number) => t("dayPlan", { count }),
  };
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [selectedAiId, setSelectedAiId] = useState<string | null>(null);
  const [aiFilter, setAiFilter] = useState<"all" | "needs-review">("all");
  const selectedAuditLog = useMemo(
    () => auditLogs.find((log) => log.id === selectedAuditId) ?? null,
    [auditLogs, selectedAuditId],
  );
  const visibleAiUsage = useMemo(
    () =>
      aiFilter === "needs-review"
        ? aiUsage.filter((usage) => usage.tokenEstimate <= 0 || usage.costEstimatePaise <= 0)
        : aiUsage,
    [aiFilter, aiUsage],
  );
  const selectedAiUsage = useMemo(
    () => aiUsage.find((usage) => usage.id === selectedAiId) ?? null,
    [aiUsage, selectedAiId],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <GlassCard>
        <SectionHeader
          eyebrow={t("activityEyebrow")}
          title={t("adminActivityTitle")}
          badge={<Pill>{t("entryCount", { count: auditLogs.length || auditLogCount })}</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/audit-logs.csv`} />}
        />
        <div className="mt-5">
          {auditLogsState.error ? (
            <ErrorNotice message={auditLogsState.error} />
          ) : auditLogsState.loading && auditLogs.length === 0 ? (
            <EmptyState title={t("loadingAdminActivity")} />
          ) : (
            <>
              <DataTable
                className="max-h-[420px] overflow-y-auto"
                columns={[
                  {
                    id: "action",
                    header: t("action"),
                    render: (log) => (
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{formatEnumLabel(log.action)}</p>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                          {formatEnumLabel(log.entityType)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "actor",
                    header: t("actor"),
                    render: (log) => (log.actorUserId ? t("teamMember") : t("system")),
                  },
                  {
                    id: "entity",
                    header: t("record"),
                    render: (log) => (log.entityId ? t("linkedRecord") : t("notAttached")),
                  },
                  {
                    id: "time",
                    header: t("created"),
                    render: (log) => formatDateTime(log.createdAt),
                  },
                  {
                    id: "diff",
                    header: t("diff"),
                    align: "right",
                    render: (log) => (
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => setSelectedAuditId(log.id)}
                        trailingIcon={<span aria-hidden="true">→</span>}
                      >
                        {t("details")}
                      </ZookButton>
                    ),
                  },
                ]}
                rows={auditLogs}
                rowKey={(log) => log.id}
                empty={t("noActivity")}
              />
              <LoadMoreButton
                count={auditLogs.length}
                hasMore={auditLogsState.hasMore}
                loading={auditLogsState.loadingMore}
                onLoadMore={auditLogsState.loadMore}
              />
            </>
          )}
        </div>
        {selectedAuditLog ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label={t("changeDetails")}
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{t("changeDetails")}</p>
                <p className="mt-1 font-medium text-[var(--text-primary)]">
                  {formatEnumLabel(selectedAuditLog.action)}
                </p>
              </div>
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setSelectedAuditId(null)}
              >
                {t("close")}
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {t("before")}
                </p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                  {JSON.stringify(selectedAuditLog.before ?? {}, null, 2)}
                </pre>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {t("after")}
                </p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                  {JSON.stringify(
                    selectedAuditLog.after ?? selectedAuditLog.metadata ?? {},
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow={t("assistantEyebrow")}
          title={t("recentAssistantDrafts")}
          badge={
            <button
              type="button"
              onClick={() => setAiFilter("needs-review")}
              className="zook-focus rounded-full"
            >
              <Pill tone={misconfiguredAiCount > 0 ? "amber" : "neutral"}>
                {t("needReviewCount", { count: misconfiguredAiCount })}
              </Pill>
            </button>
          }
        />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          {t("draftReviewTrainerApp")}
        </ManagedOn>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAiFilter("all")}
            className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              aiFilter === "all"
                ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]"
            }`}
          >
            {t("allDrafts")}
          </button>
          <button
            type="button"
            onClick={() => setAiFilter("needs-review")}
            className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              aiFilter === "needs-review"
                ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]"
            }`}
          >
            {t("needsReview")}
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState title={t("loadingAssistantDrafts")} />
          ) : visibleAiUsage.length ? (
            visibleAiUsage.slice(0, 8).map((usage) => (
              <button
                key={usage.id}
                type="button"
                onClick={() => setSelectedAiId(usage.id)}
                className="zook-focus rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-left transition hover:bg-[var(--bg-sunken)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-[var(--text-primary)]">{usage.promptSummary}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={formatEnumLabel(usage.requestType)} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {formatAiResponseSummary(usage.responseSummary, responseSummaryLabels)}
                </p>
                <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                  {formatEnumLabel(usage.role)} · {formatDateTime(usage.createdAt)}
                </p>
                <span className="mt-3 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
                  {t("openDraftDetails")} →
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title={t("noAssistantDrafts")}
            />
          )}
        </div>
        {selectedAiUsage ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label={t("assistantDraftDetails")}
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{t("draftDetails")}</p>
                <p className="mt-1 font-medium text-[var(--text-primary)]">{selectedAiUsage.promptSummary}</p>
              </div>
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setSelectedAiId(null)}
              >
                {t("close")}
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>{formatAiResponseSummary(selectedAiUsage.responseSummary, responseSummaryLabels)}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatEnumLabel(selectedAiUsage.role)} ·{" "}
                {formatEnumLabel(selectedAiUsage.requestType)} ·{" "}
                {formatDateTime(selectedAiUsage.createdAt)}
              </p>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
