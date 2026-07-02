import { SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard } from "../glass-card";
import { ZookButton } from "../zook-button";

export type PlatformFlagRow = {
  key: string;
  enabled: boolean;
  description?: string | null;
  rolloutPercent: number;
  overrideOrgIds: string[];
};

export type PlatformWebhookAttempt = {
  id: string;
  paymentEventId: string;
  status: string;
  processor?: string | null;
  startedAt: string | Date;
  errorMessage?: string | null;
};

export type PlatformAuditRow = {
  id: string;
  orgId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  riskLevel: string;
  createdAt: string | Date;
};

export function PlatformOpsSections({
  showFeatureFlags,
  showWebhooks,
  showAudit,
  featureFlags,
  webhooks,
  auditLogs,
  formatDateTime,
  formatEnumLabel,
  onToggleFeatureFlag,
  onReplayWebhook,
}: {
  showFeatureFlags: boolean;
  showWebhooks: boolean;
  showAudit: boolean;
  featureFlags: PlatformFlagRow[];
  webhooks: PlatformWebhookAttempt[];
  auditLogs: PlatformAuditRow[];
  formatDateTime: (value: string | Date) => string;
  formatEnumLabel: (value: string) => string;
  onToggleFeatureFlag: (flag: PlatformFlagRow) => void;
  onReplayWebhook: (attemptId: string) => void;
}) {
  if (!showFeatureFlags && !showWebhooks && !showAudit) return null;

  return (
    <div
      className={`grid gap-4 ${
        [showFeatureFlags, showWebhooks, showAudit].filter(Boolean).length > 1
          ? "xl:grid-cols-3"
          : ""
      }`}
    >
      {showFeatureFlags ? (
        <GlassCard id="feature-flags">
          <SectionHeader eyebrow="Flags" title="Feature flags" />
          <div className="mt-5 grid gap-3">
            {featureFlags.slice(0, 8).map((flag) => (
              <div key={flag.key} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{flag.key}</p>
                    <p className="mt-1 text-xs text-white/45">{flag.rolloutPercent}% rollout</p>
                  </div>
                  <ZookButton
                    size="sm"
                    tone={flag.enabled ? "danger" : "ghost"}
                    aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.key}`}
                    onClick={() => onToggleFeatureFlag(flag)}
                  >
                    {flag.enabled ? "Disable" : "Enable"}
                  </ZookButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {showWebhooks ? (
        <GlassCard id="webhooks">
          <SectionHeader eyebrow="Webhooks" title="Webhook monitor" />
          <div className="mt-5 grid gap-3">
            {webhooks.slice(0, 8).map((attempt) => (
              <div key={attempt.id} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <StatusPill value={formatEnumLabel(attempt.status)} />
                    <p className="mt-2 text-xs text-white/45">
                      {formatDateTime(attempt.startedAt)}
                    </p>
                  </div>
                  <ZookButton size="sm" tone="ghost" onClick={() => onReplayWebhook(attempt.id)}>
                    Replay
                  </ZookButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {showAudit ? (
        <GlassCard id="audit">
          <SectionHeader eyebrow="Audit" title="Global audit" />
          <div className="mt-5 grid gap-3">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <p className="font-medium text-white">{log.action}</p>
                <p className="mt-1 text-xs text-white/45">
                  {formatEnumLabel(log.riskLevel)} · {formatDateTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
