"use client";

import { ConfirmActionButton } from "../../confirm-action-button";
import { ErrorNotice } from "../operational-shared";
import { EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type { JoinRequestRow } from "@/components/dashboard/types";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

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
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Pipeline"
        title="Join request queue"
        badge={<Pill tone={joinRequests.length ? "amber" : "neutral"}>{joinRequests.length} pending</Pill>}
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
          joinRequests.map((request) => (
            <div key={request.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">
                      {planNamesById.get(request.planId ?? "") ?? "Membership request"}
                    </p>
                    <StatusPill value={formatEnumLabel(request.status)} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    Created {formatDateTime(request.createdAt)}
                    {request.referralCode ? ` · Referral ${request.referralCode}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {request.message ??
                      "No intake note. Consider WhatsApp-ing the member before approving."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ConfirmActionButton
                    className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--accent-fill)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Approve membership request?"
                    description={`Approve ${planNamesById.get(request.planId ?? "") ?? "this membership request"} so the member can continue to payment.`}
                    confirmLabel="Approve"
                    onConfirm={() => updateJoinRequest(request.id, "approve")}
                    disabled={queueBusyId === request.id}
                  >
                    {queueBusyId === request.id ? "Working..." : "Approve"}
                  </ConfirmActionButton>
                  <ConfirmActionButton
                    className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_38%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                    title="Reject membership request?"
                    description="Rejecting sends the member back to the request step. They need to apply again to continue."
                    confirmLabel="Reject"
                    confirmTone="danger"
                    aria-label="Reject membership request"
                    onConfirm={() => updateJoinRequest(request.id, "reject")}
                    disabled={queueBusyId === request.id}
                  >
                    {queueBusyId === request.id ? "Working..." : "Reject"}
                  </ConfirmActionButton>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Queue is clear"
            description="Open-join and reviewed memberships stay out of this queue."
          />
        )}
      </div>
    </GlassCard>
  );
}
