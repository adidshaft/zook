import { CheckCircle2, XCircle } from "lucide-react";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import type { DeskCopy } from "./copy";
import type { AttendanceQueueRecord } from "./types";

export function QueueTab({
  copy,
  pendingRecords,
  todayRecords,
  branchName,
  busyId,
  onUpdateAttendance,
}: {
  copy: DeskCopy;
  pendingRecords: AttendanceQueueRecord[];
  todayRecords: AttendanceQueueRecord[];
  branchName?: string | null;
  busyId: string;
  onUpdateAttendance: (recordId: string, action: "approve" | "reject") => void;
}) {
  return (
    <div className="grid gap-4">
      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{copy.todayQueue}</h1>
            <p className="mt-1 text-sm text-white/48">{copy.queueDescription}</p>
          </div>
          <Pill tone={pendingRecords.length ? "amber" : "lime"}>
            {pendingRecords.length} {copy.pending}
          </Pill>
        </div>
        <div className="mt-5 grid gap-3">
          {pendingRecords.length ? (
            pendingRecords.map((record) => (
              <div key={record.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-medium text-white">
                      {record.user?.name ?? record.user?.email ?? "Member"}
                    </p>
                    <p className="mt-1 text-sm text-white/48">
                      {record.suspiciousFlags?.length
                        ? record.suspiciousFlags.map(formatEnumLabel).join(", ")
                        : formatEnumLabel(record.status)}
                      {" - "}
                      {formatDateTime(record.checkedInAt)}
                    </p>
                    <p className="mt-1 text-xs text-white/38">
                      {record.plan?.name ?? copy.membership} at{" "}
                      {record.branchName ?? branchName ?? copy.branch}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === record.id}
                      onClick={() => onUpdateAttendance(record.id, "approve")}
                      className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      {copy.approve}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === record.id}
                      onClick={() => onUpdateAttendance(record.id, "reject")}
                      className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/72 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {copy.reject}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-white/48">
              {copy.noReview}
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold text-white">{copy.recentCheckIns}</h2>
        <div className="mt-4 grid gap-2">
          {todayRecords.slice(0, 10).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <span className="text-sm font-medium text-white/78">
                {record.user?.name ?? record.user?.email ?? "Member"}
              </span>
              <span className="text-xs text-white/45">{formatDateTime(record.checkedInAt)}</span>
            </div>
          ))}
          {!todayRecords.length ? <p className="text-sm text-white/45">{copy.noCheckIns}</p> : null}
        </div>
      </GlassCard>
    </div>
  );
}
