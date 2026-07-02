import { ConfirmActionButton } from "../confirm-action-button";
import { DataTable, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";

export type PlatformBroadcastRow = {
  id: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  targetOrgIds: string[];
  targetRoles: string[];
  scheduledAt?: string | Date | null;
  expiresAt?: string | Date | null;
  publishedAt?: string | Date | null;
  createdAt: string | Date;
};

export type PlatformModerationRow = {
  id: string;
  orgId: string;
  kind: string;
  targetId?: string | null;
  status: string;
  reason?: string | null;
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
};

export function PlatformContentSections({
  showBroadcasts,
  showModeration,
  broadcasts,
  moderationFlags,
  broadcastBusyId,
  moderationBusyId,
  formatDateTime,
  formatEnumLabel,
  onOpenBroadcastComposer,
  onUpdateBroadcastStatus,
  onDeleteBroadcast,
  onOpenModerationDecision,
}: {
  showBroadcasts: boolean;
  showModeration: boolean;
  broadcasts: PlatformBroadcastRow[];
  moderationFlags: PlatformModerationRow[];
  broadcastBusyId: string | null;
  moderationBusyId: string | null;
  formatDateTime: (value: string | Date) => string;
  formatEnumLabel: (value: string) => string;
  onOpenBroadcastComposer: () => void;
  onUpdateBroadcastStatus: (broadcast: PlatformBroadcastRow, status: "DRAFT" | "LIVE" | "EXPIRED") => void;
  onDeleteBroadcast: (broadcastId: string) => void;
  onOpenModerationDecision: (flag: PlatformModerationRow, decision: "APPROVED" | "REMOVED") => void;
}) {
  if (!showBroadcasts && !showModeration) return null;

  return (
    <div className={`grid gap-4 ${showBroadcasts && showModeration ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
      {showBroadcasts ? (
        <div id="broadcasts" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Broadcasts"
              title="Platform broadcasts"
              badge={<Pill>{broadcasts.length} broadcast{broadcasts.length === 1 ? "" : "s"}</Pill>}
              action={
                <ZookButton size="sm" onClick={onOpenBroadcastComposer}>
                  New broadcast
                </ZookButton>
              }
            />
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    id: "title",
                    header: "Broadcast",
                    render: (broadcast) => (
                      <div>
                        <p className="font-medium text-white">{broadcast.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-white/45">{broadcast.body}</p>
                      </div>
                    ),
                  },
                  {
                    id: "severity",
                    header: "Severity",
                    render: (broadcast) => <StatusPill value={formatEnumLabel(broadcast.severity)} />,
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (broadcast) => <StatusPill value={formatEnumLabel(broadcast.status)} />,
                  },
                  {
                    id: "created",
                    header: "Created",
                    render: (broadcast) => formatDateTime(broadcast.createdAt),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "right",
                    render: (broadcast) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={broadcastBusyId === broadcast.id || broadcast.status === "LIVE"}
                          onClick={() => onUpdateBroadcastStatus(broadcast, "LIVE")}
                        >
                          Publish
                        </ZookButton>
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={broadcastBusyId === broadcast.id || broadcast.status === "EXPIRED"}
                          onClick={() => onUpdateBroadcastStatus(broadcast, "EXPIRED")}
                        >
                          Expire
                        </ZookButton>
                        <ConfirmActionButton
                          className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={broadcastBusyId === broadcast.id}
                          title="Delete this broadcast?"
                          description="This removes the broadcast from this console. Published recipients may have seen it."
                          confirmLabel="Delete"
                          confirmTone="danger"
                          onConfirm={() => onDeleteBroadcast(broadcast.id)}
                        >
                          Delete
                        </ConfirmActionButton>
                      </div>
                    ),
                  },
                ]}
                rows={broadcasts}
                rowKey={(broadcast) => broadcast.id}
                empty="No entries."
              />
            </div>
          </GlassCard>
        </div>
      ) : null}

      {showModeration ? (
        <div id="moderation" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Moderation"
              title="Content moderation queue"
              badge={
                <Pill tone={moderationFlags.some((flag) => flag.status === "PENDING") ? "amber" : "neutral"}>
                  {moderationFlags.length} flags
                </Pill>
              }
            />
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    id: "flag",
                    header: "Flag",
                    render: (flag) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(flag.kind)}</p>
                        <p className="mt-1 text-xs text-white/45">{flag.targetId ?? flag.orgId}</p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (flag) => <StatusPill value={formatEnumLabel(flag.status)} />,
                  },
                  {
                    id: "created",
                    header: "Created",
                    render: (flag) => formatDateTime(flag.createdAt),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "right",
                    render: (flag) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={moderationBusyId === flag.id || flag.status !== "PENDING"}
                          onClick={() => onOpenModerationDecision(flag, "APPROVED")}
                        >
                          Approve
                        </ZookButton>
                        <ZookButton
                          size="sm"
                          tone="danger"
                          disabled={moderationBusyId === flag.id || flag.status !== "PENDING"}
                          onClick={() => onOpenModerationDecision(flag, "REMOVED")}
                        >
                          Remove
                        </ZookButton>
                      </div>
                    ),
                  },
                ]}
                rows={moderationFlags}
                rowKey={(flag) => flag.id}
                empty="No flags."
              />
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
