import { DataTable, ReadoutGrid, SectionHeader, StatusPill, toneFromStatus } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";
import { formatCompactNumber } from "@/lib/format";

export type ProviderDiagnostics = {
  selectedProvider?: string;
  activeProvider: string | null;
  status: string;
  missingEnv?: string[];
  mode?: string;
  configured: boolean;
  lastCheckedAt?: string;
};

export type IncidentChecklistItem = {
  step: string;
  owner: string;
  signal: string;
};

export function PlatformReadinessSections({
  showReadiness,
  showIncidentChecklist,
  providerEntries,
  readyProviderCount,
  defaultProviderCount,
  misconfiguredProviderCount,
  openFlagCount,
  incidentChecklist,
  formatDateTime,
  formatEnumLabel,
  onReloadProviders,
}: {
  showReadiness: boolean;
  showIncidentChecklist: boolean;
  providerEntries: Array<[string, ProviderDiagnostics]>;
  readyProviderCount: number;
  defaultProviderCount: number;
  misconfiguredProviderCount: number;
  openFlagCount: number;
  incidentChecklist: IncidentChecklistItem[];
  formatDateTime: (value: string | Date) => string;
  formatEnumLabel: (value: string) => string;
  onReloadProviders: () => void;
}) {
  if (!showReadiness && !showIncidentChecklist) return null;

  return (
    <>
      {showReadiness ? (
        <div id="readiness" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="System checks"
              title="Service status"
              description="Services Zook depends on, with sensitive settings hidden."
              badge={
                <Pill tone={misconfiguredProviderCount ? "red" : "lime"}>
                  {misconfiguredProviderCount} need setup
                </Pill>
              }
              action={
                <ZookButton size="sm" onClick={onReloadProviders}>
                  Check again
                </ZookButton>
              }
            />
            <div className="mt-5 grid gap-4">
              <ReadoutGrid
                items={[
                  {
                    label: "Active services",
                    value: formatCompactNumber(readyProviderCount),
                    meta: "Configured for use",
                  },
                  {
                    label: "Standard settings",
                    value: formatCompactNumber(defaultProviderCount),
                    meta: "Services using standard settings",
                  },
                  {
                    label: "Needs attention",
                    value: formatCompactNumber(misconfiguredProviderCount),
                    meta: "Services needing review",
                  },
                  {
                    label: "Open safety reviews",
                    value: formatCompactNumber(openFlagCount),
                    meta: "Reports still needing review",
                  },
                ]}
                columns={4}
              />
              <DataTable
                columns={[
                  {
                    id: "provider",
                    header: "Service",
                    render: ([category, provider]) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(category)}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {provider.configured ? "Configured" : "Review needed"} · Service{" "}
                          {provider.activeProvider ? "active" : "inactive"}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: ([, provider]) => (
                      <StatusPill
                        value={formatEnumLabel(provider.status)}
                        tone={
                          provider.status === "misconfigured" ||
                          provider.status === "unsupported"
                            ? "red"
                            : provider.status === "default"
                              ? "blue"
                              : toneFromStatus(provider.status)
                        }
                      />
                    ),
                  },
                  {
                    id: "mode",
                    header: "Mode",
                    render: ([category, provider]) =>
                      formatEnumLabel(provider.mode ?? provider.selectedProvider ?? category),
                  },
                  {
                    id: "env",
                    header: "Needs",
                    render: ([, provider]) =>
                      (provider.missingEnv?.length ?? 0) ? "Review needed" : "Nothing",
                  },
                  {
                    id: "last",
                    header: "Checked",
                    render: ([, provider]) =>
                      provider.lastCheckedAt ? formatDateTime(provider.lastCheckedAt) : "Not checked",
                  },
                ]}
                rows={providerEntries}
                rowKey={([category]) => category}
                empty="No checks."
              />
            </div>
          </GlassCard>
        </div>
      ) : null}

      {showIncidentChecklist ? (
        <div id="incident-checklist" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Incident mode"
              title="Production incident checklist"
              description="First-response steps for service outages, payment trouble, safety escalations, and gym-impacting issues."
            />
            <div className="mt-5 grid gap-3">
              {incidentChecklist.map((item, index) => (
                <div
                  key={item.step}
                  className="grid gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 md:grid-cols-[80px_1fr_0.85fr]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Step {index + 1}
                  </p>
                  <div>
                    <p className="font-medium text-white">{item.step}</p>
                    <p className="mt-1 text-xs text-white/45">Owner: {item.owner}</p>
                  </div>
                  <p className="text-sm leading-6 text-white/58">{item.signal}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[22px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/82">
              In production, keep destructive gym actions paused until service status, audit trail,
              customer impact, and rollback owner are all known.
            </div>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
}
