"use client";

import { useMemo } from "react";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../../operational-shared";
import {
  DataTable,
  EmptyState,
  SectionHeader,
  StatusPill,
  VirtualizedDataTable,
} from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import { ZookButton, ZookButtonLink } from "../../../zook-button";
import type { MemberRow } from "@/components/dashboard/types";
import { formatDate } from "@/lib/format";
import { memberFilters, type MemberFilter, type MembersState } from "./types";

const memberVirtualizationThreshold = 120;

function memberContactMeta(row: MemberRow) {
  return [row.user?.email, row.user?.phone].filter(Boolean).join(" · ") || "Contact missing";
}

function AccessMark({ inactive }: { inactive: boolean }) {
  const label = inactive ? "Inactive" : "Active";
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${
        inactive
          ? "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]"
          : "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
      }`}
    >
      <span aria-hidden>{inactive ? "!" : "✓"}</span>
    </span>
  );
}

export function MemberList({
  orgId,
  members,
  filteredMembers,
  membersState,
  filtersActive,
  memberFilter,
  setMemberFilter,
  memberSearch,
  setMemberSearch,
  selectedBulkMemberIds,
  toggleBulkMember,
  exportSelectedMembers,
  bulkArchiveMembers,
  clearSelection,
  setSelectedMemberId,
  memberAccessBusyId,
  memberAccessStatus,
  memberAccessStatusTone,
}: {
  orgId: string;
  members: MemberRow[];
  filteredMembers: MemberRow[];
  membersState: MembersState;
  filtersActive: boolean;
  memberFilter: MemberFilter;
  setMemberFilter: (filter: MemberFilter) => void;
  memberSearch: string;
  setMemberSearch: (search: string) => void;
  selectedBulkMemberIds: string[];
  toggleBulkMember: (userId: string | undefined) => void;
  exportSelectedMembers: () => void;
  bulkArchiveMembers: () => void;
  clearSelection: () => void;
  setSelectedMemberId: (memberId: string | null) => void;
  memberAccessBusyId: string | null;
  memberAccessStatus: string;
  memberAccessStatusTone: "neutral" | "lime" | "red";
  updateMemberAccess: (memberUserId: string, status: "active" | "inactive") => void;
}) {
  const useVirtualizedRoster = filteredMembers.length >= memberVirtualizationThreshold;
  const memberRosterColumns = useMemo(
    () => [
      {
        id: "select",
        header: "Select",
        render: (row: MemberRow) => (
          <input
            type="checkbox"
            checked={Boolean(row.user?.id && selectedBulkMemberIds.includes(row.user.id))}
            onChange={() => toggleBulkMember(row.user?.id)}
            aria-label={`Select ${row.user?.name ?? "member"}`}
            className="zook-focus h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-sunken)] accent-[var(--accent-fill)]"
          />
        ),
      },
      {
        id: "member",
        header: "Member",
        render: (row: MemberRow) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text-primary)]">
              {row.user?.name ?? "Member profile"}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
              {memberContactMeta(row)}
            </p>
          </div>
        ),
      },
      {
        id: "goal",
        header: "Goal",
        render: (row: MemberRow) => (
          <p className="max-w-[220px] truncate">{row.user?.fitnessGoal ?? "Goal pending"}</p>
        ),
      },
      {
        id: "access",
        header: "Access",
        render: (row: MemberRow) => (
          <AccessMark inactive={row.membership?.status === "inactive"} />
        ),
      },
      {
        id: "joined",
        header: "Created",
        render: (row: MemberRow) => formatDate(row.profile.createdAt),
      },
      {
        id: "detail",
        header: "Actions",
        align: "right" as const,
        render: (row: MemberRow) => (
          <ZookButton
            type="button"
            tone="ghost"
            size="sm"
            onClick={() => row.user?.id && setSelectedMemberId(row.user.id)}
            disabled={!row.user?.id}
          >
            View
          </ZookButton>
        ),
      },
    ],
    [
      selectedBulkMemberIds,
      setSelectedMemberId,
      toggleBulkMember,
    ],
  );

  return (
    <GlassCard className="xl:col-span-1">
      <SectionHeader
        eyebrow="Members"
        title="Member roster"
        badge={
          <Pill>
            {filtersActive ? `${filteredMembers.length}/${members.length}` : members.length}{" "}
            profiles
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/members.csv`} />}
      />
      <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {memberFilters.map((filter) => {
            const active = filter === memberFilter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setMemberFilter(filter)}
                className="zook-focus rounded-full"
                aria-pressed={active}
              >
                <Pill
                  tone={active ? "blue" : filter === "Pending Payment" ? "amber" : "neutral"}
                  className={active ? "border-[var(--border-focus)]" : "hover:bg-[var(--surface)]"}
                >
                  {filter}
                </Pill>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={memberSearch}
          onChange={(event) => setMemberSearch(event.target.value)}
          placeholder="Search name, email, phone, member ID"
          className="zook-focus min-h-10 min-w-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] lg:w-[360px]"
        />
      </div>
      <div className="mt-5">
        {membersState.error ? (
          <ErrorNotice message={membersState.error} />
        ) : membersState.loading && members.length === 0 ? (
          <EmptyState title="Loading member roster" />
        ) : (
          <>
            {useVirtualizedRoster ? (
              <VirtualizedDataTable
                columns={memberRosterColumns}
                rows={filteredMembers}
                rowKey={(row) => row.profile.id}
                rowHeight={92}
                maxHeight={620}
                tableMinWidth="980px"
                gridTemplateColumns="56px minmax(260px,1.4fr) minmax(180px,0.9fr) minmax(120px,0.6fr) minmax(120px,0.7fr) 96px"
                empty={<MemberListEmpty filtersActive={filtersActive} />}
              />
            ) : (
              <DataTable
                columns={memberRosterColumns}
                rows={filteredMembers}
                rowKey={(row) => row.profile.id}
                className="max-h-[620px] overflow-y-auto"
                empty={<MemberListEmpty filtersActive={filtersActive} />}
              />
            )}
            {selectedBulkMemberIds.length ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-4 py-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedBulkMemberIds.length} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <ZookButton type="button" size="sm" onClick={exportSelectedMembers}>
                    Export selected
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={bulkArchiveMembers}
                    disabled={memberAccessBusyId === "bulk"}
                  >
                    Bulk archive
                  </ZookButton>
                  <ZookButton type="button" tone="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </ZookButton>
                </div>
              </div>
            ) : null}
            {memberAccessStatus ? (
              <div className="mt-3">
                <StatusPill value={memberAccessStatus} tone={memberAccessStatusTone} />
              </div>
            ) : null}
            <LoadMoreButton
              count={members.length}
              hasMore={membersState.hasMore}
              loading={membersState.loadingMore}
              onLoadMore={membersState.loadMore}
            />
          </>
        )}
      </div>
    </GlassCard>
  );
}

function MemberListEmpty({ filtersActive }: { filtersActive: boolean }) {
  return (
    <EmptyState
      title={filtersActive ? "No members match" : "No members"}
      description={
        filtersActive
          ? "Try a different filter or search term."
          : "Create your first membership plan and share your join link to start accepting members."
      }
      action={
        filtersActive ? null : (
          <ZookButtonLink href="/dashboard/plans">Create a plan</ZookButtonLink>
        )
      }
    />
  );
}
