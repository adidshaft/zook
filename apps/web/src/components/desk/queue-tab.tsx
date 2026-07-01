import { CheckCircle2, XCircle } from "lucide-react";
import { AvatarInitials } from "../dashboard-primitives";
import { formatDateTime } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { AttendanceQueueRecord } from "./types";
import { ageLabel, memberLabel } from "./utils";

const queueFlagLabels: Record<string, string> = {
  EARLY_CHECKIN: "Early check-in",
  EXPIRED_MEMBERSHIP: "Expired membership",
  OUT_OF_BRANCH: "Different branch",
  RAPID_REPEAT: "Repeat scan",
  STALE_TOKEN: "Old QR code",
  local_dev_scan: "Test scan",
  manual_override: "Manual override",
};

function queueReviewLabel(record: AttendanceQueueRecord) {
  const flag = record.suspiciousFlags?.[0];
  if (flag) return queueFlagLabels[flag] ?? "Needs review";
  if (record.status === "PENDING_APPROVAL") return "Needs review";
  if (record.status === "APPROVED") return "Approved";
  if (record.status === "REJECTED") return "Rejected";
  return "Review check-in";
}

function QueueMark({ label, urgent = false }: { label: string; urgent?: boolean }) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${
        urgent
          ? "border-amber-200/30 bg-amber-200/10 text-amber-100"
          : "border-white/10 bg-white/8 text-white/62"
      }`}
    >
      {label.slice(0, 1)}
    </span>
  );
}

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
  function recordPhoto(record: AttendanceQueueRecord) {
    return record.profile?.profilePhotoUrl ?? record.user?.profilePhotoUrl ?? null;
  }

  return (
    <div className="grid gap-4">
      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{copy.todayQueue}</h1>
            <p className="mt-1 text-sm text-white/48">{copy.queueDescription}</p>
          </div>
          <Pill tone={pendingRecords.length ? "amber" : "neutral"}>
            {pendingRecords.length} {copy.pending}
          </Pill>
        </div>
        <div className="mt-5 grid gap-3">
          {pendingRecords.length ? (
            pendingRecords.map((record) => (
              <div key={record.id} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    {recordPhoto(record) ? (
                      <img
                        src={recordPhoto(record) ?? undefined}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <AvatarInitials
                        name={memberLabel(record)}
                        className="h-11 w-11 rounded-xl border-amber-200/20 bg-amber-200/10 text-sm text-amber-100"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <QueueMark
                          label={queueReviewLabel(record)}
                          urgent={(record.suspiciousFlags ?? []).length > 0}
                        />
                        <p className="truncate font-medium text-white">
                          {memberLabel(record)}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-sm text-white/48">
                        {queueReviewLabel(record)} · {formatDateTime(record.checkedInAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/38">
                        {record.plan?.name ?? copy.membership} at{" "}
                        {record.branchName ?? branchName ?? copy.branch}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {record.entryCode ? (
                          <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.68rem] text-white/52">
                            {record.entryCode}
                          </span>
                        ) : null}
                        {record.user?.privateHandle ? (
                          <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.68rem] text-white/52">
                            {record.user.privateHandle}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.68rem] text-white/45">
                          {ageLabel(record.user?.dateOfBirth)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.68rem] text-white/45">
                          {recordPhoto(record) ? copy.photoMatches : copy.profilePhotoMissing}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ZookButton
                      type="button"
                      size="sm"
                      disabled={busyId === record.id}
                      state={busyId === record.id ? "loading" : "idle"}
                      onClick={() => onUpdateAttendance(record.id, "approve")}
                      leadingIcon={<CheckCircle2 size={16} />}
                    >
                      {copy.approve}
                    </ZookButton>
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      disabled={busyId === record.id}
                      state={busyId === record.id ? "loading" : "idle"}
                      onClick={() => onUpdateAttendance(record.id, "reject")}
                      leadingIcon={<XCircle size={16} />}
                    >
                      {copy.reject}
                    </ZookButton>
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
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                {recordPhoto(record) ? (
                  <img
                    src={recordPhoto(record) ?? undefined}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <AvatarInitials
                    name={memberLabel(record)}
                    className="h-10 w-10 rounded-xl border-transparent bg-white/8 text-sm text-white/70"
                  />
                )}
                <span className="truncate text-sm font-medium text-white/78">
                  {memberLabel(record)}
                </span>
                {record.entryCode ? (
                  <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.68rem] text-white/45">
                    {record.entryCode}
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-white/45">{formatDateTime(record.checkedInAt)}</span>
            </div>
          ))}
          {!todayRecords.length ? <p className="text-sm text-white/45">{copy.noCheckIns}</p> : null}
        </div>
      </GlassCard>
    </div>
  );
}
