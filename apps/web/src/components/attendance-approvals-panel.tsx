"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format";

type AttendanceQueueRecord = {
  id: string;
  status: string;
  checkedInAt: string;
  suspiciousFlags?: string[] | null;
  user?: { name?: string | null; email?: string | null } | null;
  profile?: { profilePhotoUrl?: string | null } | null;
  plan?: { name?: string | null } | null;
  subscription?: { endsAt?: string | null; remainingVisits?: number | null } | null;
};

const flagDescriptions: Record<string, string> = {
  EXPIRED_MEMBERSHIP: "Membership ended before this scan.",
  EARLY_CHECKIN: "Member scanned earlier than the allowed entry window.",
  OUT_OF_BRANCH: "Scan happened at a branch outside the membership scope.",
  STALE_TOKEN: "QR token was older than the allowed scan window.",
  RAPID_REPEAT: "Multiple scans happened too close together.",
};

const flagPriority: Record<string, number> = {
  EXPIRED_MEMBERSHIP: 0,
  OUT_OF_BRANCH: 1,
  STALE_TOKEN: 2,
  RAPID_REPEAT: 3,
  EARLY_CHECKIN: 4,
};

function recordPriority(record: AttendanceQueueRecord) {
  const flags = record.suspiciousFlags ?? [];
  if (!flags.length) return 9;
  return Math.min(...flags.map((flag) => flagPriority[flag] ?? 8));
}

function recordTimestamp(record: AttendanceQueueRecord) {
  const timestamp = new Date(record.checkedInAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatFlagLabel(flag: string) {
  return flag
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function ExceptionMark({ label, urgent = false }: { label: string; urgent?: boolean }) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${
        urgent
          ? "border-[color-mix(in_srgb,var(--feedback-warning)_42%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]"
      }`}
    >
      {label.slice(0, 1)}
    </span>
  );
}

export function AttendanceApprovalsPanel({ orgId }: { orgId: string }) {
  const [records, setRecords] = useState<AttendanceQueueRecord[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setError("");
      const payload = await webApiFetch<{ records: AttendanceQueueRecord[] }>(`/api/orgs/${orgId}/attendance/live`);
      setRecords(payload.records);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load attendance exceptions.");
    }
  }, [orgId]);

  useEffect(() => {
    void loadRecords();
    const timer = window.setInterval(() => {
      void loadRecords();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [loadRecords]);

  async function updateRecord(recordId: string, action: "approve" | "reject") {
    try {
      setBusyId(recordId);
      await webApiFetch(`/api/orgs/${orgId}/attendance/${recordId}/${action}`, {
        method: "POST",
        ...(action === "reject" ? { body: { reason: "Operator rejected this check-in exception." } } : {})
      });
      await loadRecords();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update attendance record.");
    } finally {
      setBusyId(null);
    }
  }

  const priorityRecords = [...records].sort((left, right) => {
    const priority = recordPriority(left) - recordPriority(right);
    return priority || recordTimestamp(left) - recordTimestamp(right);
  });
  const highRiskCount = records.filter((record) =>
    (record.suspiciousFlags ?? []).some((flag) => ["EXPIRED_MEMBERSHIP", "OUT_OF_BRANCH"].includes(flag)),
  ).length;
  const noFlagCount = records.filter((record) => !(record.suspiciousFlags ?? []).length).length;

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Exception feed</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">QR entry is self-approved; unusual scans are flagged for review.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href={`/api/orgs/${orgId}/reports/attendance.csv`}
            download
            className="zook-focus inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-strong)] hover:text-[var(--accent-strong)] transition"
          >
            Export CSV
          </a>
          <Pill>{records.length} exceptions</Pill>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      {records.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["High-risk", highRiskCount],
            ["Flagged", records.length - noFlagCount],
            ["No flag", noFlagCount],
          ].map(([label, value]) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5"
            >
              <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
              <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {value}
              </span>
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 grid gap-2">
        {!records.length ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4 text-sm text-[var(--text-tertiary)]">
            No flagged check-ins.
          </div>
        ) : null}
        {priorityRecords.map((record) => (
          <div key={record.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <ExceptionMark
                    label={record.status}
                    urgent={(record.suspiciousFlags ?? []).length > 0}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      {record.user?.name ?? record.user?.email ?? "Member"}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                      {record.plan?.name ?? "Membership"} · {formatTime(record.checkedInAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(record.suspiciousFlags ?? []).length ? (
                    (record.suspiciousFlags ?? []).map((flag) => (
                      <span
                        key={flag}
                        title={flagDescriptions[flag] ?? "This scan needs manual review."}
                        className="rounded-full border border-[color-mix(in_srgb,var(--feedback-warning)_32%,transparent)] bg-[var(--surface-warning-soft)] px-2 py-1 text-[0.68rem] font-semibold text-[var(--feedback-warning)]"
                      >
                        {formatFlagLabel(flag)}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-1 text-[0.68rem] text-[var(--text-tertiary)]">
                      No specific flag
                    </span>
                  )}
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-1 text-[0.68rem] text-[var(--text-tertiary)]">
                    {record.subscription?.endsAt
                      ? `Expiry ${formatDate(record.subscription.endsAt)}`
                      : "No expiry"}
                    {record.subscription?.remainingVisits !== undefined && record.subscription?.remainingVisits !== null
                      ? ` · ${record.subscription.remainingVisits} visits`
                      : ""}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <ZookButton
                  type="button"
                  size="sm"
                  onClick={() => void updateRecord(record.id, "approve")}
                  disabled={busyId === record.id}
                  state={busyId === record.id ? "loading" : "idle"}
                  leadingIcon={<CheckCircle2 size={16} />}
                >
                  Approve
                </ZookButton>
                <ZookButton
                  type="button"
                  tone="danger"
                  size="sm"
                  onClick={() => void updateRecord(record.id, "reject")}
                  disabled={busyId === record.id}
                  state={busyId === record.id ? "loading" : "idle"}
                  leadingIcon={<XCircle size={16} />}
                >
                  Reject
                </ZookButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
