"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import type { ClassRow } from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { withBranch } from "./panel-config";
import type { BranchSummary, MemberRow } from "./types";

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
      webApiFetch<{ classes: ClassRow[] }>(
        withBranch(`/api/orgs/${orgId}/classes`, branch),
      ),
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

  return (
    <div className="grid gap-4">
      <GlassCard variant="strong">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Classes
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              Enroll walk-in members
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Search a member, then add them to an upcoming class from the desk.
            </p>
          </div>
          <Pill>{branch?.name ?? "All branches"}</Pill>
        </div>
      </GlassCard>

      <GlassCard>
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          Find member
          <input
            value={memberQuery}
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Name, phone, or email"
            className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleMembers.map((member) => {
            const user = member.user;
            if (!user) return null;
            const selected = selectedMemberId === user.id;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedMemberId(user.id)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selected
                    ? "border-[var(--accent-fill)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                }`}
              >
                <span className="block font-semibold text-[var(--text-primary)]">{user.name}</span>
                <span>{user.phone ?? user.email}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {classesQuery.isLoading ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">Loading upcoming classes.</p>
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
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">No upcoming classes available.</p>
        </GlassCard>
      ) : null}
      {classes.map((entry) => (
        <GlassCard key={entry.id}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CalendarDays size={16} className="text-[var(--accent-strong)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">{entry.name}</h3>
                <Pill>{formatEnumLabel(entry.classType)}</Pill>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {formatDateTime(entry.startTime)} · {entry.branchName ?? branch?.name ?? "Branch"}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                <Users size={13} />
                {entry.enrollmentCount}/{entry.maxCapacity} enrolled
              </p>
            </div>
            <ZookButton
              size="sm"
              disabled={!selectedMemberId || enrollMember.isPending}
              state={enrollMember.isPending ? "loading" : "idle"}
              onClick={() => enrollMember.mutate(entry.id)}
            >
              {entry.remainingCapacity <= 0 ? "Add to waitlist" : "Enroll member"}
            </ZookButton>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
