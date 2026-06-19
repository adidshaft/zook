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
import type { MemberRow, OrganizationSnapshot } from "@/components/dashboard/types";
import { formatDate } from "@/lib/format";
import { memberFilters, type MemberFilter, type MembersState } from "./types";

const memberVirtualizationThreshold = 120;

export function MemberList({
  orgId,
  organization,
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
  clearSelection,
  setSelectedMemberId,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
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
  clearSelection: () => void;
  setSelectedMemberId: (memberId: string | null) => void;
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
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {row.user?.name ?? "Member profile"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {row.user?.email ?? "No email recorded"}
            </p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        render: (row: MemberRow) => (
          <div>
            <p>{row.user?.phone ?? organization.contactPhone ?? "Desk follow-up needed"}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {row.user?.fitnessGoal ?? "Goal capture pending"}
            </p>
          </div>
        ),
      },
      {
        id: "profile",
        header: "Profile state",
        render: (row: MemberRow) => (
          <div className="flex flex-wrap gap-2">
            <StatusPill
              value={row.profile.publicVisibility ? "Visible" : "Private"}
              tone="neutral"
            />
            <StatusPill
              value={row.profile.marketingOptIn ? "Marketing on" : "Marketing off"}
              tone="neutral"
            />
          </div>
        ),
      },
      {
        id: "joined",
        header: "Created",
        render: (row: MemberRow) => formatDate(row.profile.createdAt),
      },
      {
        id: "detail",
        header: "Detail",
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
    [organization.contactPhone, selectedBulkMemberIds, setSelectedMemberId, toggleBulkMember],
  );

  return (
    <GlassCard className="xl:col-span-1">
      <SectionHeader
        eyebrow="Members"
        title="Member roster"
        description="Profiles come from the member directory."
        badge={
          <Pill>
            {filtersActive ? `${filteredMembers.length}/${members.length}` : members.length} profiles
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/members.csv`} />}
      />
      <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
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
          className="zook-focus min-h-11 min-w-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] lg:w-[360px]"
        />
      </div>
      <div className="mt-5">
        {membersState.error ? (
          <ErrorNotice message={membersState.error} />
        ) : membersState.loading && members.length === 0 ? (
          <EmptyState
            title="Loading member roster"
            description="Loading current organization member list."
          />
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
                gridTemplateColumns="56px minmax(220px,1.2fr) minmax(220px,1fr) minmax(180px,1fr) minmax(120px,0.7fr) 96px"
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
            {filteredMembers.length ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
                <p className="text-sm text-[var(--text-tertiary)]">
                  {useVirtualizedRoster
                    ? `Virtualized roster active for ${filteredMembers.length} loaded matches.`
                    : `Showing ${filteredMembers.length} loaded match${filteredMembers.length === 1 ? "" : "es"}.`}{" "}
                  Refine search for faster action at large scale.
                </p>
              </div>
            ) : null}
            {selectedBulkMemberIds.length ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-4 py-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedBulkMemberIds.length} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <ZookButton type="button" size="sm" onClick={exportSelectedMembers}>
                    Export selected
                  </ZookButton>
                  <ZookButton type="button" tone="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </ZookButton>
                </div>
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
      title={filtersActive ? "No loaded members match" : "No members yet"}
      description={
        filtersActive
          ? "Try a different filter or search term. This filters the currently loaded roster."
          : "Create your first membership plan and share your join link to start accepting members."
      }
      action={filtersActive ? null : <ZookButtonLink href="/dashboard/plans">Create a plan</ZookButtonLink>}
    />
  );
}
