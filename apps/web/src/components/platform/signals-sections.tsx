import { DataTable, EmptyState, SectionHeader, StatusPill, toneFromStatus } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { formatInr } from "@/lib/format";

export type PlatformUsageRow = {
  id: string;
  orgId?: string | null;
  requestType: string;
  promptSummary: string;
  costEstimatePaise: number;
  tokenEstimate: number;
};

export type PlatformAbuseFlag = {
  id: string;
  userId?: string | null;
  type: string;
  severity: string;
  status: string;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
};

export function PlatformAssistantSection({
  show,
  usage,
  loading,
  error,
  formatEnumLabel,
}: {
  show: boolean;
  usage: PlatformUsageRow[];
  loading: boolean;
  error?: string | null;
  formatEnumLabel: (value: string) => string;
}) {
  if (!show) return null;

  return (
    <div id="ai-traffic" className="scroll-mt-5">
      <GlassCard>
        <SectionHeader
          eyebrow="Assistant"
          title="Recent assistant activity"
          badge={<Pill>{usage.length} events</Pill>}
        />
        <div className="mt-5">
          {error ? (
            <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : loading && usage.length === 0 ? (
            <EmptyState title="Loading assistant activity" />
          ) : (
            <DataTable
              columns={[
                {
                  id: "prompt",
                  header: "Draft",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-white">{row.promptSummary}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {row.orgId ? "Gym account" : "Platform account"}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "type",
                  header: "Category",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(row.requestType)} />
                    </div>
                  ),
                },
                {
                  id: "tokens",
                  header: "Size",
                  align: "right",
                  render: (row) => (row.tokenEstimate > 0 ? "Detailed" : "Short"),
                },
                {
                  id: "cost",
                  header: "Cost",
                  align: "right",
                  render: (row) => formatInr(row.costEstimatePaise),
                },
              ]}
              rows={usage}
              rowKey={(row) => row.id}
              empty="No activity."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export function PlatformSafetySection({
  show,
  flags,
  openFlagCount,
  error,
  formatDateTime,
  formatEnumLabel,
}: {
  show: boolean;
  flags: PlatformAbuseFlag[];
  openFlagCount: number;
  error?: string | null;
  formatDateTime: (value: string | Date) => string;
  formatEnumLabel: (value: string) => string;
}) {
  if (!show) return null;

  return (
    <div id="abuse-flags" className="scroll-mt-5">
      <GlassCard>
        <SectionHeader
          eyebrow="Safety"
          title="Recent reports"
          badge={<Pill tone={openFlagCount ? "amber" : "neutral"}>{openFlagCount} open</Pill>}
        />
        <div className="mt-5 grid gap-3">
          {error ? (
            <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : flags.length ? (
            flags.slice(0, 10).map((flag) => (
              <div
                key={flag.id}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{formatEnumLabel(flag.type)}</p>
                    <p className="mt-2 text-xs text-white/45">
                      {flag.userId ? "Member report" : "Gym report"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      value={formatEnumLabel(flag.severity)}
                      tone={
                        flag.severity.toLowerCase().includes("high")
                          ? "red"
                          : flag.severity.toLowerCase().includes("medium")
                            ? "amber"
                            : "blue"
                      }
                    />
                    <StatusPill
                      value={formatEnumLabel(flag.status)}
                      tone={toneFromStatus(flag.status)}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/40">
                  {formatDateTime(flag.createdAt)}
                  {flag.resolvedAt ? ` · Resolved ${formatDateTime(flag.resolvedAt)}` : ""}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No reports" />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
