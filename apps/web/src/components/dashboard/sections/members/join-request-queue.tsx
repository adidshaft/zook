"use client";

import { ErrorNotice } from "../../operational-shared";
import { EmptyState, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import type { JoinRequestRow } from "../../../dashboard-operational-model";
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
        description="Approval-required requests appear here so owners can approve or reject memberships before payment."
        badge={<Pill tone={joinRequests.length ? "amber" : "lime"}>{joinRequests.length} pending</Pill>}
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
            <div key={request.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">
                      {planNamesById.get(request.planId ?? "") ?? "Membership request"}
                    </p>
                    <StatusPill value={formatEnumLabel(request.status)} />
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    Created {formatDateTime(request.createdAt)}
                    {request.referralCode ? ` · Referral ${request.referralCode}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {request.message ??
                      "No intake note. Consider WhatsApp-ing the member before approving."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void updateJoinRequest(request.id, "approve")}
                    disabled={queueBusyId === request.id}
                    className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => void updateJoinRequest(request.id, "reject")}
                    disabled={queueBusyId === request.id}
                    className="zook-focus rounded-full border border-red-300/30 bg-red-300/10 px-4 py-2 text-sm text-red-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Queue is clear"
            description="Open-join or already-reviewed memberships will not stack up here."
          />
        )}
      </div>
    </GlassCard>
  );
}
