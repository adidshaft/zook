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
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { PagedState } from "./types";

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
              eyebrow="Entry & attendance"
              title="QR code and entry codes"
              description="Members scan the gym QR, receive a unique entry code, and present it at the floor or desk."
              badge={<StatusPill value="Member QR" />}
              action={
                <a
                  href={branchScope.selectedBranch?.id ? `/dashboard/attendance/qr-display?branchId=${encodeURIComponent(branchScope.selectedBranch.id)}` : "/dashboard/attendance/qr-display"}
                  target="_blank"
                  rel="noreferrer"
                  className="zook-focus inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg-sunken)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition shadow-sm"
                >
                  Open QR in New Tab
                </a>
              }
            />
            <ReadoutGrid
              className="mt-5"
              items={[
                {
                  label: "Branch",
                  value: selectedBranchName,
                  meta: branchScope.selectedBranch
                    ? "Branch for QR and member attendance"
                    : "Set up your branch to start accepting members",
                },
                {
                  label: "Today scans",
                  value: formatCompactNumber(summary.todayAttendance),
                  meta: "Members receive visible entry codes",
                },
                {
                  label: "Join mode",
                  value: formatEnumLabel(organization.joinMode),
                  meta: "Used during membership requests",
                },
                {
                  label: "Trial window",
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
          eyebrow="Attendance"
          title="Recent attendance scans"
          badge={<Pill>{attendanceRecords.length} scan{attendanceRecords.length === 1 ? "" : "s"}</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/reports/attendance.csv`} />}
        />
        <div className="mt-5">
          {attendanceState.error ? (
            <ErrorNotice message={attendanceState.error} />
          ) : attendanceState.loading && attendanceRecords.length === 0 ? (
            <EmptyState title="Loading attendance" />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    id: "member",
                    header: "Member",
                    render: (record) => (
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {record.user?.name ?? record.user?.email ?? "Member"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                          {record.plan?.name ?? record.planName ?? "Membership"}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (record) => <StatusPill value={formatEnumLabel(record.status)} />,
                  },
                  {
                    id: "remaining",
                    header: "Visits",
                    align: "right",
                    render: (record) =>
                      record.subscription?.remainingVisits === null ||
                      record.subscription?.remainingVisits === undefined
                        ? "Open"
                        : record.subscription.remainingVisits.toString(),
                  },
                  {
                    id: "time",
                    header: "Checked in",
                    render: (record) => formatDateTime(record.checkedInAt),
                  },
                ]}
                rows={attendanceRecords}
                rowKey={(record) => record.id}
                empty="No scans."
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
