"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
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
        <Pill tone="lime">{records.length} exceptions</Pill>
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
                      <Pill key={flag} tone="amber">
                        {flag}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void updateRecord(record.id, "approve")}
                  disabled={busyId === record.id}
                  className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
                <button
                  onClick={() => void updateRecord(record.id, "reject")}
                  disabled={busyId === record.id}
                  className="zook-focus inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-300/10 px-4 py-2 text-sm text-red-100 disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
