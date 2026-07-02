"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Search, Users } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import type { ClassRow } from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { withBranch } from "./panel-config";
import type { BranchSummary, MemberRow } from "./types";

function deskClassTypeLabel(type: string | null | undefined) {
  const value = (type ?? "").trim();
  if (!value) return "Class";
  if (value.toLowerCase() === "hiit") return "HIIT";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function DeskClassesPanel({
  orgId,
  branch,
  members,
}: {
  orgId: string;
  branch: BranchSummary | null;
  members: MemberRow[];
}) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const classesQuery = useQuery({
    queryKey: ["desk", "classes", orgId, branch?.id ?? "all"],
    queryFn: () =>
      webApiFetch<{ classes: ClassRow[] }>(withBranch(`/api/orgs/${orgId}/classes`, branch)),
  });
  const visibleMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    return members
      .filter((member) => {
        const user = member.user;
        if (!query) return true;
        return [user?.name, user?.email, user?.phone]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      .slice(0, 12);
  }, [memberQuery, members]);
  const enrollMember = useMutation({
    mutationFn: (classId: string) =>
      webApiFetch(`/api/orgs/${orgId}/classes/${classId}/enroll`, {
        method: "POST",
        body: { memberUserId: selectedMemberId },
        feedback: { success: "Member enrolled in class." },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["desk", "classes", orgId] });
      await queryClient.invalidateQueries({ queryKey: ["classes", orgId] });
    },
  });
  const classes = (classesQuery.data?.classes ?? []).filter(
    (entry) => entry.status.toLowerCase() !== "cancelled",
  );
  const canEnroll = classes.length > 0;
  const selectedMember = members.find((member) => member.user?.id === selectedMemberId)?.user;

  return (
    <div className="grid gap-3">
      {classesQuery.isLoading ? (
        <GlassCard>
          <div className="grid gap-2">
            <div className="h-4 w-40 rounded-full bg-[var(--surface)]" />
            <div className="h-12 rounded-2xl bg-[var(--bg-sunken)]" />
            <div className="h-16 rounded-2xl bg-[var(--bg-sunken)]" />
          </div>
        </GlassCard>
      ) : null}
      {classesQuery.isError ? (
        <GlassCard variant="danger">
          <p className="text-sm text-[var(--text-primary)]">
            {(classesQuery.error as Error).message || "Classes could not load."}
          </p>
        </GlassCard>
      ) : null}
      {!classesQuery.isLoading && !classes.length ? (
        <GlassCard className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">No upcoming classes</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Schedule classes to enable walk-in enrollment here.
              </p>
            </div>
            <Link
              href="/dashboard/classes"
              className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]"
            >
              Open class schedule
            </Link>
          </div>
        </GlassCard>
      ) : null}

      {canEnroll ? (
        <GlassCard className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Walk-in class enrollment
                </h2>
                <Pill>{branch?.name ?? "All branches"}</Pill>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Select a member once, then add them to any class below.
              </p>
            </div>
            {selectedMember ? (
              <div className="rounded-xl border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-3 py-2 text-right">
                <p className="text-xs text-[var(--text-tertiary)]">Selected member</p>
                <p className="max-w-[14rem] truncate text-sm font-semibold text-[var(--text-primary)]">
                  {selectedMember.name}
                </p>
              </div>
            ) : null}
          </div>

          <label className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
            <span className="sr-only">Find member</span>
            <span className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                aria-hidden="true"
              />
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="Find member by name, phone, or email"
                className="min-h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
              />
            </span>
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {visibleMembers.map((member) => {
              const user = member.user;
              if (!user) return null;
              const selected = selectedMemberId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedMemberId(user.id)}
                  className={`zook-focus min-w-[12rem] rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "border-[var(--accent-fill)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
                      : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="block truncate font-semibold text-[var(--text-primary)]">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs">{user.phone ?? user.email}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]">
            {classes.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarDays size={15} className="text-[var(--accent-strong)]" />
                    <h3 className="truncate font-semibold text-[var(--text-primary)]">{entry.name}</h3>
                    <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                      {deskClassTypeLabel(entry.classType)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatDateTime(entry.startTime)} · {entry.branchName ?? branch?.name ?? "Branch"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Users size={13} />
                    {entry.enrollmentCount}/{entry.maxCapacity}
                  </span>
                  <ZookButton
                    size="sm"
                    disabled={!selectedMemberId || enrollMember.isPending}
                    state={enrollMember.isPending ? "loading" : "idle"}
                    onClick={() => enrollMember.mutate(entry.id)}
                  >
                    {entry.remainingCapacity <= 0 ? "Waitlist" : "Enroll"}
                  </ZookButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
