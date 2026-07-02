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
import { useT } from "@/lib/use-t";
import { memberFilters, type MemberFilter, type MembersState } from "./types";

const memberVirtualizationThreshold = 120;

type MembersT = ReturnType<typeof useT>;

function memberContactMeta(row: MemberRow, t: MembersT) {
  return [row.user?.email, row.user?.phone].filter(Boolean).join(" · ") || t("contactMissing");
}

function memberFilterLabel(filter: MemberFilter, t: MembersT) {
  const keyByFilter: Record<MemberFilter, Parameters<MembersT>[0]> = {
    All: "filterAll",
    Active: "filterActive",
    "Pending Payment": "filterPendingPayment",
    "Expiring Soon": "filterExpiringSoon",
    "Missing Contact": "filterMissingContact",
    Expired: "filterExpired",
    Paused: "filterPaused",
    "Visit Pack": "filterVisitPack",
    Trial: "filterTrial",
  };
  return t(keyByFilter[filter]);
}

function AccessMark({ inactive, t }: { inactive: boolean; t: MembersT }) {
  const label = inactive ? t("accessInactive") : t("accessActive");
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
  const t = useT("members");
  const useVirtualizedRoster = filteredMembers.length >= memberVirtualizationThreshold;
  const memberRosterColumns = useMemo(
    () => [
      {
        id: "select",
        header: t("select"),
        render: (row: MemberRow) => (
          <input
            type="checkbox"
            checked={Boolean(row.user?.id && selectedBulkMemberIds.includes(row.user.id))}
            onChange={() => toggleBulkMember(row.user?.id)}
            aria-label={t("selectMember", { name: row.user?.name ?? t("memberFallback") })}
            className="zook-focus h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-sunken)] accent-[var(--accent-fill)]"
          />
        ),
      },
      {
        id: "member",
        header: t("member"),
        render: (row: MemberRow) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-[var(--text-primary)]">
              {row.user?.name ?? t("memberProfile")}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
              {memberContactMeta(row, t)}
            </p>
          </div>
        ),
      },
      {
        id: "goal",
        header: t("goal"),
        render: (row: MemberRow) => (
          <p className="max-w-[220px] truncate">{row.user?.fitnessGoal ?? t("goalPending")}</p>
        ),
      },
      {
        id: "access",
        header: t("access"),
        render: (row: MemberRow) => (
          <AccessMark inactive={row.membership?.status === "inactive"} t={t} />
        ),
      },
      {
        id: "joined",
        header: t("created"),
        render: (row: MemberRow) => formatDate(row.profile.createdAt),
      },
      {
        id: "detail",
        header: t("actions"),
        align: "right" as const,
        render: (row: MemberRow) => (
          <ZookButton
            type="button"
            tone="ghost"
            size="sm"
            onClick={() => row.user?.id && setSelectedMemberId(row.user.id)}
            disabled={!row.user?.id}
          >
            {t("view")}
          </ZookButton>
        ),
      },
    ],
    [
      selectedBulkMemberIds,
      setSelectedMemberId,
      t,
      toggleBulkMember,
    ],
  );

  return (
    <GlassCard className="xl:col-span-1">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("rosterTitle")}
        badge={
          <Pill>
            {filtersActive ? `${filteredMembers.length}/${members.length}` : members.length}{" "}
            {t("profiles")}
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
                  {memberFilterLabel(filter, t)}
                </Pill>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={memberSearch}
          onChange={(event) => setMemberSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="zook-focus min-h-10 min-w-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] lg:w-[360px]"
        />
      </div>
      <div className="mt-5">
        {membersState.error ? (
          <ErrorNotice message={membersState.error} />
        ) : membersState.loading && members.length === 0 ? (
          <EmptyState title={t("loadingRoster")} />
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
                  {t("selected", { count: selectedBulkMemberIds.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ZookButton type="button" size="sm" onClick={exportSelectedMembers}>
                    {t("exportSelected")}
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={bulkArchiveMembers}
                    disabled={memberAccessBusyId === "bulk"}
                  >
                    {t("bulkArchive")}
                  </ZookButton>
                  <ZookButton type="button" tone="ghost" size="sm" onClick={clearSelection}>
                    {t("clear")}
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
  const t = useT("members");
  return (
    <EmptyState
      title={filtersActive ? t("noMembersMatch") : t("noMembers")}
      description={
        filtersActive
          ? t("noMembersMatchDescription")
          : t("noMembersDescription")
      }
      action={
        filtersActive ? null : (
          <ZookButtonLink href="/dashboard/plans">{t("createPlan")}</ZookButtonLink>
        )
      }
    />
  );
}
