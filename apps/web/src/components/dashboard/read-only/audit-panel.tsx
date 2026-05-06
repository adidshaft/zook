"use client";

import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
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
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Assistant"
          title="Recent assistant drafts"
          description="Review assisted drafts before anything member-facing is published."
          badge={
            <Pill tone={misconfiguredAiCount > 0 ? "amber" : "lime"}>
              {misconfiguredAiCount} need review
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState
              title="Loading drafts"
              description="Getting the latest assisted drafts for this gym."
            />
          ) : aiUsage.length ? (
            aiUsage.slice(0, 8).map((usage) => (
              <div key={usage.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
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
              </div>
            ))
          ) : (
            <EmptyState
              title="No assistant drafts yet"
              description="Assisted drafts will appear here after the team starts using the planner."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
