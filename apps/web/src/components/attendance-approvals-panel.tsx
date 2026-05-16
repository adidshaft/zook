"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { HelpHint } from "./ui";
import { ZookButton } from "./zook-button";
import { webApiFetch } from "@/lib/api-client";

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

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Exception feed</h2>
          <p className="mt-1 text-sm text-white/45">QR entry is self-approved; unusual scans appear here only when flagged.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href={`/api/orgs/${orgId}/reports/attendance.csv`}
            download
            className="zook-focus inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/6 px-4 text-sm font-semibold text-white/78 hover:border-lime-300/35 hover:text-lime-100"
          >
            Export CSV
          </a>
          <Pill tone="lime">{records.length} exceptions</Pill>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      <div className="mt-5 grid gap-3">
        {!records.length ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
            No flagged check-ins right now.
          </div>
        ) : null}
        {records.map((record) => (
          <div key={record.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{record.user?.name ?? record.user?.email ?? "Member"}</p>
                  <Pill>{record.status}</Pill>
                </div>
                <p className="mt-2 text-sm text-white/45">
                  {record.plan?.name ?? "Membership"} · {new Date(record.checkedInAt).toLocaleTimeString()}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {record.subscription?.endsAt
                    ? `Expiry ${new Date(record.subscription.endsAt).toLocaleDateString()}`
                    : "No expiry available"}
                  {record.subscription?.remainingVisits !== undefined && record.subscription?.remainingVisits !== null
                    ? ` · ${record.subscription.remainingVisits} visits left`
                    : ""}
                </p>
                {(record.suspiciousFlags ?? []).length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(record.suspiciousFlags ?? []).map((flag) => (
                      <span key={flag} className="inline-flex items-center gap-1">
                        <Pill tone="amber">{flag}</Pill>
                        <HelpHint label={flag} title={flag} size="xs">
                          {flagDescriptions[flag] ?? "This scan needs manual review."}
                        </HelpHint>
                      </span>
                    ))}
                  </div>
                ) : null}
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
