import { CheckCircle2, XCircle } from "lucide-react";
import { AvatarInitials } from "../dashboard-primitives";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { AttendanceQueueRecord } from "./types";
import { ageLabel } from "./utils";

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

  function memberLabel(record: AttendanceQueueRecord) {
    return record.user?.name ?? record.user?.email ?? "Member";
  }

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
                  <div className="flex min-w-0 gap-3">
                    {recordPhoto(record) ? (
                      <img
                        src={recordPhoto(record) ?? undefined}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <AvatarInitials
                        name={memberLabel(record)}
                        className="h-16 w-16 rounded-2xl border-amber-200/20 bg-amber-200/10 text-xl text-amber-100"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">
                          {memberLabel(record)}
                        </p>
                        {record.user?.privateHandle ? (
                          <Pill>{record.user.privateHandle}</Pill>
                        ) : null}
                        {record.entryCode ? <Pill tone="blue">{record.entryCode}</Pill> : null}
                      </div>
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
                      <p className="mt-1 text-xs text-white/38">
                        {ageLabel(record.user?.dateOfBirth)}
                      </p>
                      <p className="mt-2 text-xs text-white/42">
                        {recordPhoto(record) ? copy.photoMatches : copy.profilePhotoMissing}
                      </p>
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
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
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
                {record.entryCode ? <Pill tone="blue">{record.entryCode}</Pill> : null}
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
