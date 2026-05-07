"use client";

import { useMemo, useState } from "react";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import type { AIUsageRow, AuditLogRow } from "../../dashboard-operational-model";
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
          badge={<Pill tone="blue">{auditLogs.length || auditLogCount} entries</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/audit-logs.csv`} />}
        />
        <div className="mt-5">
          {auditLogsState.error ? (
            <ErrorNotice message={auditLogsState.error} />
          ) : auditLogsState.loading && auditLogs.length === 0 ? (
            <EmptyState title="Loading activity" description="Getting the latest admin actions." />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    id: "action",
                    header: "Action",
                    render: (log) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(log.action)}</p>
                        <p className="mt-1 text-xs text-white/45">
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
                      <button
                        type="button"
                        onClick={() => setSelectedAuditId(log.id)}
                        className="zook-focus inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
                      >
                        Details
                        <span aria-hidden="true">→</span>
                      </button>
                    ),
                  },
                ]}
                rows={auditLogs}
                rowKey={(log) => log.id}
                empty="No admin activity is available yet."
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
            aria-label="Audit diff"
            className="mt-4 rounded-[22px] border border-white/10 bg-black/35 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Audit diff</p>
                <p className="mt-1 font-medium text-white">
                  {formatEnumLabel(selectedAuditLog.action)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditId(null)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <pre className="max-h-72 overflow-auto rounded-[18px] border border-white/10 bg-black/40 p-3 text-xs leading-5 text-white/60">
                {JSON.stringify(selectedAuditLog.before ?? {}, null, 2)}
              </pre>
              <pre className="max-h-72 overflow-auto rounded-[18px] border border-white/10 bg-black/40 p-3 text-xs leading-5 text-white/60">
                {JSON.stringify(selectedAuditLog.after ?? selectedAuditLog.metadata ?? {}, null, 2)}
              </pre>
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
            <Pill tone={misconfiguredAiCount > 0 ? "amber" : "lime"}>
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
            className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold ${
              aiFilter === "all"
                ? "border-lime-300/45 bg-lime-300/12 text-lime-100"
                : "border-white/10 text-white/55"
            }`}
          >
            All drafts
          </button>
          <button
            type="button"
            onClick={() => setAiFilter("needs-review")}
            className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold ${
              aiFilter === "needs-review"
                ? "border-lime-300/45 bg-lime-300/12 text-lime-100"
                : "border-white/10 text-white/55"
            }`}
          >
            Needs review
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState
              title="Loading drafts"
              description="Getting the latest assisted drafts for this gym."
            />
          ) : visibleAiUsage.length ? (
            visibleAiUsage.slice(0, 8).map((usage) => (
              <button
                key={usage.id}
                type="button"
                onClick={() => setSelectedAiId(usage.id)}
                className="zook-focus rounded-[22px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{usage.promptSummary}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={formatEnumLabel(usage.requestType)} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {formatAiResponseSummary(usage.responseSummary)}
                </p>
                <p className="mt-3 text-xs text-white/40">
                  {formatEnumLabel(usage.role)} · {formatDateTime(usage.createdAt)}
                </p>
                <span className="mt-3 inline-flex text-xs font-semibold text-lime-100">
                  Open draft details →
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title="No assistant drafts yet"
              description="Assisted drafts will appear here after the team starts using the planner."
            />
          )}
        </div>
        {selectedAiUsage ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Assistant draft details"
            className="mt-4 rounded-[22px] border border-white/10 bg-black/35 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Draft details</p>
                <p className="mt-1 font-medium text-white">{selectedAiUsage.promptSummary}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAiId(null)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
              >
                Close
              </button>
            </div>
            <pre className="mt-4 max-h-80 overflow-auto rounded-[18px] border border-white/10 bg-black/40 p-3 text-xs leading-5 text-white/60">
              {JSON.stringify(selectedAiUsage, null, 2)}
            </pre>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
