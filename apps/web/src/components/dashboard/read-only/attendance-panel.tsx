"use client";

import { AttendanceApprovalsPanel } from "../../attendance-approvals-panel";
import { AttendanceManualCheckinForm } from "../attendance-manual-checkin-form";
import { AttendanceQrPanel } from "../../attendance-qr-panel";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatDaysRemaining,
  formatEnumLabel,
} from "@/lib/format";
import type {
  AttendanceRecordRow,
  BranchScopeSnapshot,
  OrganizationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { PagedState } from "./types";

type AttendanceT = ReturnType<typeof useT>;

function attendanceJoinModeLabel(mode: string | null | undefined, t: AttendanceT) {
  if (mode === "AUTO_APPROVE") return t("joinModeAutoApprove");
  if (mode === "APPROVAL_REQUIRED") return t("joinModeApprovalRequired");
  if (mode === "INVITE_ONLY") return t("joinModeInviteOnly");
  return formatEnumLabel(mode ?? "join");
}

function attendanceStatusLabel(status: string | null | undefined, t: AttendanceT) {
  if (status === "APPROVED") return t("statusApproved");
  if (status === "PENDING_APPROVAL") return t("statusNeedsReview");
  if (status === "REJECTED") return t("statusRejected");
  if (status === "FLAGGED") return t("statusFlagged");
  if (status === "FAILED") return t("statusFailed");
  if (status === "RECORDED") return t("statusRecorded");
  return formatEnumLabel(status ?? "recorded");
}

export function AttendancePanel({
  orgId,
  organization,
  summary,
  branchScope,
  selectedBranchName,
  attendanceRecords,
  attendanceState,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  attendanceRecords: AttendanceRecordRow[];
  attendanceState: PagedState;
}) {
  const t = useT("attendance");
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4">
          <AttendanceManualCheckinForm
            orgId={orgId}
            branchId={branchScope.selectedBranch?.id}
            onCheckedIn={() => void attendanceState.reload?.()}
          />
          <AttendanceApprovalsPanel orgId={orgId} />
        </div>
        <div className="grid gap-4">
          <AttendanceQrPanel
            orgId={orgId}
            branchId={branchScope.selectedBranch?.id ?? null}
            branchName={selectedBranchName}
            density="compact"
          />
          <GlassCard>
            <SectionHeader
              eyebrow={t("entryAttendance")}
              title={t("qrCodeEntryCodes")}
              description={t("qrCodeEntryDescription")}
              badge={<StatusPill value={t("memberQr")} />}
              action={
                <a
                  href={branchScope.selectedBranch?.id ? `/dashboard/attendance/qr-display?branchId=${encodeURIComponent(branchScope.selectedBranch.id)}` : "/dashboard/attendance/qr-display"}
                  target="_blank"
                  rel="noreferrer"
                  className="zook-focus inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg-sunken)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition shadow-sm"
                >
                  {t("openQrNewTab")}
                </a>
              }
            />
            <ReadoutGrid
              className="mt-5"
              items={[
                {
                  label: t("branch"),
                  value: selectedBranchName,
                  meta: branchScope.selectedBranch
                    ? t("branchQrMeta")
                    : t("setupBranchMeta"),
                },
                {
                  label: t("todayScans"),
                  value: formatCompactNumber(summary.todayAttendance),
                  meta: t("visibleEntryCodes"),
                },
                {
                  label: t("joinMode"),
                  value: attendanceJoinModeLabel(organization.joinMode, t),
                  meta: t("usedDuringMembershipRequests"),
                },
                {
                  label: t("trialWindow"),
                  value: formatDaysRemaining(summary.trialDaysRemaining),
                  meta: formatDate(organization.trialEndAt),
                },
              ]}
              columns={1}
            />
          </GlassCard>
        </div>
      </div>
      <GlassCard>
        <SectionHeader
          eyebrow={t("attendance")}
          title={t("recentAttendanceScans")}
          badge={<Pill>{t("scanCount", { count: attendanceRecords.length })}</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/reports/attendance.csv`} />}
        />
        <div className="mt-5">
          {attendanceState.error ? (
            <ErrorNotice message={attendanceState.error} />
          ) : attendanceState.loading && attendanceRecords.length === 0 ? (
            <EmptyState title={t("loadingAttendance")} />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    id: "member",
                    header: t("member"),
                    render: (record) => (
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {record.user?.name ?? record.user?.email ?? t("memberFallback")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                          {record.plan?.name ?? record.planName ?? t("membershipFallback")}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: t("status"),
                    render: (record) => <StatusPill value={attendanceStatusLabel(record.status, t)} />,
                  },
                  {
                    id: "remaining",
                    header: t("visits"),
                    align: "right",
                    render: (record) =>
                      record.subscription?.remainingVisits === null ||
                      record.subscription?.remainingVisits === undefined
                        ? t("open")
                        : record.subscription.remainingVisits.toString(),
                  },
                  {
                    id: "time",
                    header: t("checkedIn"),
                    render: (record) => formatDateTime(record.checkedInAt),
                  },
                ]}
                rows={attendanceRecords}
                rowKey={(record) => record.id}
                empty={t("noScans")}
              />
              <LoadMoreButton
                count={attendanceRecords.length}
                hasMore={attendanceState.hasMore}
                loading={attendanceState.loadingMore}
                onLoadMore={attendanceState.loadMore}
              />
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
