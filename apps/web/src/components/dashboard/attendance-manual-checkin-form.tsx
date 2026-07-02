"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserCheck } from "lucide-react";
import { GlassCard } from "../glass-card";
import { SectionHeader } from "../dashboard-primitives";
import { ZookButton } from "../zook-button";
import { webApiFetch } from "@/lib/api-client";
import { useT } from "@/lib/use-t";

type MemberOption = {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
};

export function AttendanceManualCheckinForm({
  orgId,
  branchId,
  onCheckedIn,
}: {
  orgId: string;
  branchId?: string | null | undefined;
  onCheckedIn?: () => void;
}) {
  const t = useT("attendance");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersError, setMembersError] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchMembers = useCallback(async (query: string) => {
    try {
      setMembersLoading(true);
      setMembersError("");
      const trimmed = query.trim();
      const params = new URLSearchParams({ limit: "20" });
      if (trimmed) {
        params.set("q", trimmed);
      }
      const payload = await webApiFetch<{ members: MemberOption[] }>(
        `/api/orgs/${orgId}/members?${params.toString()}`,
      );
      setMembers(payload.members);
    } catch (cause) {
      setMembersError(cause instanceof Error ? cause.message : t("unableSearchMembers"));
    } finally {
      setMembersLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    void searchMembers("");
  }, [searchMembers]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleMemberQueryChange(value: string) {
    setMemberQuery(value);
    setMemberUserId("");
    setSuccess("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void searchMembers(value);
    }, 300);
  }

  const selectedMember = useMemo(
    () => members.find((member) => member.user?.id === memberUserId) ?? null,
    [members, memberUserId],
  );

  function selectMember(member: MemberOption) {
    if (!member.user?.id) return;
    setMemberUserId(member.user.id);
    setMemberQuery(member.user.name ?? member.user.email ?? "");
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setMemberUserId("");
    setMemberQuery("");
    setReason("");
    setNotes("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!memberUserId) {
      setError(t("selectMemberToCheckIn"));
      return;
    }
    if (reason.trim().length < 2) {
      setError(t("manualReasonRequired"));
      return;
    }

    try {
      setSubmitting(true);
      await webApiFetch(`/api/orgs/${orgId}/attendance/manual`, {
        method: "POST",
        body: {
          memberUserId,
          ...(branchId ? { branchId } : {}),
          reason: reason.trim(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
        feedback: { success: false },
      });
      setSuccess(t("checkedInSuccessfully", { name: selectedMember?.user?.name ?? t("memberFallback") }));
      resetForm();
      onCheckedIn?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("unableRecordManualCheckIn"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("frontDesk")}
        title={t("manualCheckInOverride")}
        description={t("manualCheckInDescription")}
      />
      <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="relative">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("member")}
          </label>
          <input
            value={memberQuery}
            onChange={(event) => {
              handleMemberQueryChange(event.target.value);
            }}
            placeholder={t("searchMemberPlaceholder")}
            className="zook-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            autoComplete="off"
          />
          {membersError ? (
            <p className="mt-2 text-xs text-red-300">{membersError}</p>
          ) : null}
          {!memberUserId ? (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
              {membersLoading ? (
                <p className="px-4 py-3 text-sm text-[var(--text-tertiary)]">{t("loadingMembers")}</p>
              ) : members.length ? (
                members.map((member) => (
                  <button
                    key={member.user?.id}
                    type="button"
                    onClick={() => selectMember(member)}
                    className="zook-focus flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-sunken)]"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {member.user?.name ?? t("memberFallback")}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {member.user?.email ?? member.user?.phone ?? ""}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-[var(--text-tertiary)]">{t("noMembersMatch")}</p>
              )}
            </div>
          ) : null}
          {memberUserId ? (
            <p className="mt-2 text-xs text-[var(--accent-strong)]">
              {t("selectedMember", { name: selectedMember?.user?.name ?? selectedMember?.user?.email ?? t("memberFallback") })}
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("reason")} <span className="text-red-300">*</span>
          </label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={200}
            className="zook-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("notesOptional")}
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("notesPlaceholder")}
            maxLength={500}
            rows={2}
            className="zook-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {success ? <p className="text-sm text-[var(--accent-strong)]">{success}</p> : null}

        <div className="flex justify-end">
          <ZookButton
            type="submit"
            size="sm"
            disabled={!memberUserId || reason.trim().length < 2 || submitting}
            state={submitting ? "loading" : "idle"}
            leadingIcon={<UserCheck size={16} />}
          >
            {submitting ? t("checkingIn") : t("recordCheckIn")}
          </ZookButton>
        </div>
      </form>
    </GlassCard>
  );
}
