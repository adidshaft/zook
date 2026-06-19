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
          eyebrow="Activity"
          title="Admin activity"
          description="Sensitive changes, who made them, and when they happened."
          badge={<Pill>{auditLogs.length || auditLogCount} entries</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/audit-logs.csv`} />}
        />
        <div className="mt-5">
          {auditLogsState.error ? (
            <ErrorNotice message={auditLogsState.error} />
          ) : auditLogsState.loading && auditLogs.length === 0 ? (
            <EmptyState title="Loading activity" />
          ) : (
            <>
              <DataTable
                className="max-h-[420px] overflow-y-auto"
                columns={[
                  {
                    id: "action",
                    header: "Action",
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
                    header: "Actor",
                    render: (log) => (log.actorUserId ? "Team member" : "System"),
                  },
                  {
                    id: "entity",
                    header: "Record",
                    render: (log) => (log.entityId ? "Linked record" : "Not attached"),
                  },
                  {
                    id: "time",
                    header: "Created",
                    render: (log) => formatDateTime(log.createdAt),
                  },
                  {
                    id: "diff",
                    header: "Diff",
                    align: "right",
                    render: (log) => (
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => setSelectedAuditId(log.id)}
                        trailingIcon={<span aria-hidden="true">→</span>}
                      >
                        Details
                      </ZookButton>
                    ),
                  },
                ]}
                rows={auditLogs}
                rowKey={(log) => log.id}
                empty="No admin activity."
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
            aria-label="Change details"
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Change details</p>
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
                Close
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Before
                </p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                  {JSON.stringify(selectedAuditLog.before ?? {}, null, 2)}
                </pre>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  After
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
          eyebrow="Assistant"
          title="Recent assistant drafts"
          description="Review assisted drafts before anything member-facing is published."
          badge={
            <button
              type="button"
              onClick={() => setAiFilter("needs-review")}
              className="zook-focus rounded-full"
            >
              <Pill tone={misconfiguredAiCount > 0 ? "amber" : "neutral"}>
                {misconfiguredAiCount} need review
              </Pill>
            </button>
          }
        />
        <ManagedOn surface="trainer-mobile" className="mt-4">
          Draft review happens in the Trainer app.
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
            All drafts
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
            Needs review
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState title="Loading drafts" />
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
                  {formatAiResponseSummary(usage.responseSummary)}
                </p>
                <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                  {formatEnumLabel(usage.role)} · {formatDateTime(usage.createdAt)}
                </p>
                <span className="mt-3 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
                  Open draft details →
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title="No assistant drafts"
            />
          )}
        </div>
        {selectedAiUsage ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Assistant draft details"
            className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Draft details</p>
                <p className="mt-1 font-medium text-[var(--text-primary)]">{selectedAiUsage.promptSummary}</p>
              </div>
              <ZookButton
                type="button"
                tone="ghost"
                size="sm"
                onClick={() => setSelectedAiId(null)}
              >
                Close
              </ZookButton>
            </div>
            <div className="mt-4 grid gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>{formatAiResponseSummary(selectedAiUsage.responseSummary)}</p>
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
