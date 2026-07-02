"use client";

import { ConfirmActionButton } from "../../confirm-action-button";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type { JoinRequestRow } from "@/components/dashboard/types";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { useT } from "@/lib/use-t";

type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

function waitingDays(value: string | Date) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

type MembersT = ReturnType<typeof useT>;

function joinRequestStatusLabel(status: string | null | undefined, t: MembersT) {
  if (status === "PENDING") return t("statusPending");
  if (status === "APPROVED") return t("joinStatusApproved");
  if (status === "REJECTED") return t("joinStatusRejected");
  if (status === "CANCELLED") return t("joinStatusCancelled");
  return formatEnumLabel(status ?? "request");
}

export function JoinRequestQueue({
  joinRequests,
  joinRequestsState,
  queueError,
  queueBusyId,
  planNamesById,
  updateJoinRequest,
}: {
  joinRequests: JoinRequestRow[];
  joinRequestsState: ResourceState<{ joinRequests: JoinRequestRow[] }>;
  queueError: string;
  queueBusyId: string | null;
  planNamesById: Map<string, string>;
  updateJoinRequest: (requestId: string, action: "approve" | "reject") => Promise<void>;
}) {
  const t = useT("members");
  const requestsWithNotes = joinRequests.filter((request) => request.message?.trim()).length;
  const referralRequests = joinRequests.filter((request) => request.referralCode).length;
  const missingPlanRequests = joinRequests.filter((request) => !request.planId).length;
  const oldestWaitingDays = joinRequests.reduce(
    (oldest, request) => Math.max(oldest, waitingDays(request.createdAt)),
    0,
  );

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("pipeline")}
        title={t("joinRequestQueue")}
        badge={
          <Pill tone={joinRequests.length ? "amber" : "neutral"}>
            {t("pendingCount", { count: joinRequests.length })}
          </Pill>
        }
      />
      {queueError ? (
        <div className="mt-5">
          <ErrorNotice message={queueError} />
        </div>
      ) : null}
      <div className="mt-5 grid gap-3">
        {joinRequestsState.error ? (
          <ErrorNotice message={joinRequestsState.error} />
        ) : joinRequests.length ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                {
                  label: t("pendingReview"),
                  value: joinRequests.length,
                  detail: t("waitingOwnerDecision"),
                },
                {
                  label: t("withIntakeNote"),
                  value: requestsWithNotes,
                  detail: t("enoughContextApprove"),
                },
                {
                  label: t("referralRequests"),
                  value: referralRequests,
                  detail: missingPlanRequests
                    ? t("missingPlanCount", { count: missingPlanRequests })
                    : t("rewardAttributionReady"),
                },
                {
                  label: t("oldestWait"),
                  value: t("daysShort", { days: oldestWaitingDays }),
                  detail:
                    oldestWaitingDays > 1 ? t("followUpBeforeLeadCools") : t("freshQueue"),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3"
                >
                  <p className="text-xs text-[var(--text-tertiary)]">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">{item.detail}</p>
                </div>
              ))}
            </div>
            {joinRequests.map((request) => (
              <div key={request.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)]">
                        {planNamesById.get(request.planId ?? "") ?? t("membershipRequest")}
                      </p>
                      <StatusPill value={joinRequestStatusLabel(request.status, t)} />
                      {request.message?.trim() ? <Pill tone="blue">{t("intakeNote")}</Pill> : null}
                      {!request.planId ? <Pill tone="amber">{t("noPlanBadge")}</Pill> : null}
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {t("createdAt", { date: formatDateTime(request.createdAt) })}
                      {request.referralCode
                        ? ` · ${t("referralCode", { code: request.referralCode })}`
                        : ""}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {request.message ?? t("noIntakeNote")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ConfirmActionButton
                      className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--accent-fill)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      title={t("approveMembershipRequestTitle")}
                      description={t("approveMembershipRequestDescription", {
                        plan: planNamesById.get(request.planId ?? "") ?? t("membershipRequest"),
                      })}
                      confirmLabel={t("approve")}
                      onConfirm={() => updateJoinRequest(request.id, "approve")}
                      disabled={queueBusyId === request.id}
                    >
                      {queueBusyId === request.id ? t("working") : t("approve")}
                    </ConfirmActionButton>
                    <ConfirmActionButton
                      className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_38%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                      title={t("rejectMembershipRequestTitle")}
                      description={t("rejectMembershipRequestDescription")}
                      confirmLabel={t("reject")}
                      confirmTone="danger"
                      aria-label={t("rejectMembershipRequestTitle")}
                      onConfirm={() => updateJoinRequest(request.id, "reject")}
                      disabled={queueBusyId === request.id}
                    >
                      {queueBusyId === request.id ? t("working") : t("reject")}
                    </ConfirmActionButton>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            title={t("queueClear")}
            description={t("queueClearDescription")}
          />
        )}
      </div>
    </GlassCard>
  );
}
