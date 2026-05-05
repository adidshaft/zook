"use client";

import { useState } from "react";
import { DataTable, EmptyState, ReadoutGrid, SectionHeader, StatusPill, toneFromStatus } from "./dashboard-primitives";
import { GlassCard, Pill } from "./glass-card";
import { formatCompactNumber, formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";

type PlatformOrganization = {
  id: string;
  name: string;
  username: string;
  city: string;
  state?: string | null;
  status: string;
  joinMode: string;
  createdAt: string | Date;
  trialEndAt: string | Date;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type PlatformAbuseFlag = {
  id: string;
  orgId: string;
  userId?: string | null;
  type: string;
  severity: string;
  status: string;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
};

type PlatformUsageRow = {
  id: string;
  orgId?: string | null;
  role: string;
  provider: string;
  requestType: string;
  promptSummary: string;
  costEstimatePaise: number;
  tokenEstimate: number;
  createdAt: string;
};

type ProviderDiagnostics = {
  category: string;
  selectedProvider: string;
  activeProvider: string | null;
  status: string;
  missingEnv: string[];
  env: Record<string, boolean>;
  provider: string;
  mode: string;
  configured: boolean;
  lastCheckedAt?: string;
  requestId?: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function PlatformOperationsPanel({
  initialOrgs,
  initialFlags
}: {
  initialOrgs: PlatformOrganization[];
  initialFlags: PlatformAbuseFlag[];
}) {
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");

  const organizationsState = useOperationalResource<{ orgs: PlatformOrganization[] }>({
    path: "/api/platform/orgs",
    initialData: { orgs: initialOrgs }
  });
  const providersState = useOperationalResource<{ providers: Record<string, ProviderDiagnostics> }>({
    path: "/api/platform/provider-status"
  });
  const usageState = useOperationalResource<{ usage: PlatformUsageRow[] }>({
    path: "/api/platform/ai-usage"
  });
  const flagsState = useOperationalResource<{ flags: PlatformAbuseFlag[] }>({
    path: "/api/platform/abuse-flags",
    initialData: { flags: initialFlags }
  });

  const organizations = organizationsState.data?.orgs ?? initialOrgs;
  const providers = providersState.data?.providers ?? {};
  const providerEntries = Object.entries(providers);
  const usage = usageState.data?.usage ?? [];
  const flags = flagsState.data?.flags ?? initialFlags;

  const misconfiguredProviders = providerEntries.filter(([, provider]) => provider.status === "misconfigured" || provider.status === "unsupported");
  const readyProviders = providerEntries.filter(([, provider]) => provider.status === "ready");
  const defaultProviders = providerEntries.filter(([, provider]) => provider.status === "default");
  const suspendedOrganizations = organizations.filter((org) => org.status === "SUSPENDED");
  const openFlags = flags.filter((flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved");

  async function updateOrganizationStatus(orgId: string, status: "ACTIVE" | "SUSPENDED" | "CANCELLED") {
    try {
      setStatusError("");
      setBusyOrgId(orgId);
      await webApiFetch(`/api/platform/orgs/${orgId}/status`, {
        method: "PATCH",
        body: { status }
      });
      organizationsState.reload();
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : "Unable to update organization status.");
    } finally {
      setBusyOrgId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div id="readiness" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Provider Registry"
            title="Runtime readiness"
            description="These diagnostics come from the backend provider registry. They are safe for admins and intentionally avoid exposing raw secrets or env values."
            badge={<Pill tone={misconfiguredProviders.length ? "red" : "lime"}>{misconfiguredProviders.length} need setup</Pill>}
            action={
              <button
                className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                onClick={() => providersState.reload()}
              >
                Run Readiness Check
              </button>
            }
          />
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <ReadoutGrid
            items={[
              {
                label: "Ready",
                value: formatCompactNumber(readyProviders.length),
                meta: "Explicit live providers that are configured"
              },
              {
                label: "Defaulted",
                value: formatCompactNumber(defaultProviders.length),
                meta: "Mock or local-first paths still active"
              },
              {
                label: "Misconfigured",
                value: formatCompactNumber(misconfiguredProviders.length),
                meta: "Provider env gaps or unsupported selections"
              },
              {
                label: "Open abuse flags",
                value: formatCompactNumber(openFlags.length),
                meta: "Recent platform signals still unresolved"
              }
            ]}
            columns={2}
          />
          <DataTable
            columns={[
              {
                id: "provider",
                header: "Provider lane",
                render: ([category, provider]) => (
                  <div>
                    <p className="font-medium text-white">{formatEnumLabel(category)}</p>
                    <p className="mt-1 text-xs text-white/45">
                      Selected {formatEnumLabel(provider.selectedProvider)} · Active {provider.activeProvider ? formatEnumLabel(provider.activeProvider) : "None"}
                    </p>
                  </div>
                )
              },
              {
                id: "status",
                header: "Status",
                render: ([, provider]) => (
                  <StatusPill
                    value={formatEnumLabel(provider.status)}
                    tone={
                      provider.status === "misconfigured" || provider.status === "unsupported"
                        ? "red"
                        : provider.status === "default"
                          ? "blue"
                          : toneFromStatus(provider.status)
                    }
                  />
                )
              },
              {
                id: "mode",
                header: "Mode",
                render: ([, provider]) => formatEnumLabel(provider.mode)
              },
              {
                id: "env",
                header: "Missing env",
                render: ([, provider]) => (provider.missingEnv.length ? provider.missingEnv.join(", ") : "None")
              },
              {
                id: "last",
                header: "Last check",
                render: ([, provider]) => provider.lastCheckedAt ? formatDateTime(provider.lastCheckedAt) : "Latest registry read"
              },
              {
                id: "request",
                header: "Request ID",
                render: ([, provider]) => provider.requestId ?? "Not recorded"
              },
              {
                id: "notes",
                header: "Notes",
                render: ([, provider]) => provider.notes ?? "Secrets are never exposed."
              }
            ]}
            rows={providerEntries}
            rowKey={([category]) => category}
            empty="Provider diagnostics are not available yet."
          />
        </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div id="organizations" className="scroll-mt-5">
          <GlassCard>
          <SectionHeader
            eyebrow="Organizations"
            title="Status control matrix"
            description="This is the live organization roster, including quick status controls for platform admin intervention."
            badge={<Pill tone={suspendedOrganizations.length ? "amber" : "lime"}>{suspendedOrganizations.length} suspended</Pill>}
          />
          {statusError ? <div className="mt-5"><p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{statusError}</p></div> : null}
          {organizationsState.error ? <div className="mt-5"><p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{organizationsState.error}</p></div> : null}
          <div className="mt-5">
            <DataTable
              columns={[
                {
                  id: "org",
                  header: "Organization",
                  render: (org) => (
                    <div>
                      <p className="font-medium text-white">{org.name}</p>
                      <p className="mt-1 text-xs text-white/45">@{org.username}</p>
                    </div>
                  )
                },
                {
                  id: "city",
                  header: "Location",
                  render: (org) => `${org.city}${org.state ? `, ${org.state}` : ""}`
                },
                {
                  id: "join",
                  header: "Join mode",
                  render: (org) => formatEnumLabel(org.joinMode)
                },
                {
                  id: "status",
                  header: "Status",
                  render: (org) => <StatusPill value={formatEnumLabel(org.status)} />
                },
                {
                  id: "trial",
                  header: "Trial end",
                  render: (org) => formatDate(org.trialEndAt)
                },
                {
                  id: "actions",
                  header: "Actions",
                  render: (org) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      {(["ACTIVE", "SUSPENDED", "CANCELLED"] as const).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => void updateOrganizationStatus(org.id, nextStatus)}
                          disabled={busyOrgId === org.id || org.status === nextStatus}
                          className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/72 disabled:opacity-45"
                        >
                          {nextStatus === "ACTIVE" ? "Activate" : nextStatus === "SUSPENDED" ? "Suspend" : "Cancel"}
                        </button>
                      ))}
                    </div>
                  ),
                  align: "right"
                }
              ]}
              rows={organizations}
              rowKey={(org) => org.id}
              empty="No organizations are currently available."
            />
          </div>
          </GlassCard>
        </div>

        <div className="grid gap-4">
          <GlassCard>
            <SectionHeader
              eyebrow="Risk Rail"
              title="Platform watchlist"
              description="A concise read on which orgs are drifting into operational trouble."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Open abuse flags",
                  value: formatCompactNumber(openFlags.length),
                  meta: "Signals that still need platform review"
                },
                {
                  label: "Suspended orgs",
                  value: formatCompactNumber(suspendedOrganizations.length),
                  meta: "Currently blocked by platform action"
                },
                {
                  label: "Recent AI events",
                  value: formatCompactNumber(usage.length),
                  meta: "Latest 100 usage logs across organizations"
                }
              ]}
            />
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Escalation lanes"
              title="Contact posture"
              description="When a provider or abuse review escalates, these are the first org contacts platform ops will usually need."
            />
            <div className="mt-5 grid gap-3">
              {organizations.slice(0, 4).map((org) => (
                <div key={org.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white">{org.name}</p>
                  <p className="mt-2 text-sm text-white/55">{org.contactEmail ?? org.contactPhone ?? "No contact captured"}</p>
                  <p className="mt-2 text-xs text-white/40">Created {formatDate(org.createdAt)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div id="ai-traffic" className="scroll-mt-5">
          <GlassCard>
          <SectionHeader
            eyebrow="AI Traffic"
            title="Recent platform-wide AI activity"
            description="This is a high-signal slice of AI usage across organizations, useful for cost and abuse pattern reviews."
            badge={<Pill tone="blue">{usage.length} events</Pill>}
          />
          <div className="mt-5">
            {usageState.error ? (
              <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{usageState.error}</p>
            ) : usageState.loading && usage.length === 0 ? (
              <EmptyState title="Loading AI traffic" description="Pulling the most recent platform AI usage rows." />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "prompt",
                    header: "Prompt",
                    render: (row) => (
                      <div>
                        <p className="font-medium text-white">{row.promptSummary}</p>
                        <p className="mt-1 text-xs text-white/45">{row.orgId ?? "Platform scope"}</p>
                      </div>
                    )
                  },
                  {
                    id: "type",
                    header: "Type",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill value={formatEnumLabel(row.provider)} tone="blue" />
                        <StatusPill value={formatEnumLabel(row.requestType)} />
                      </div>
                    )
                  },
                  {
                    id: "tokens",
                    header: "Tokens",
                    align: "right",
                    render: (row) => row.tokenEstimate.toString()
                  },
                  {
                    id: "cost",
                    header: "Cost",
                    align: "right",
                    render: (row) => formatInr(row.costEstimatePaise)
                  }
                ]}
                rows={usage}
                rowKey={(row) => row.id}
                empty="No AI usage rows are currently available."
              />
            )}
          </div>
          </GlassCard>
        </div>

        <div id="abuse-flags" className="scroll-mt-5">
          <GlassCard>
          <SectionHeader
            eyebrow="Abuse Signals"
            title="Recent flags"
            description="Recent organization abuse flags from the database, including severity and whether the flag is still open."
            badge={<Pill tone={openFlags.length ? "amber" : "lime"}>{openFlags.length} open</Pill>}
          />
          <div className="mt-5 grid gap-3">
            {flagsState.error ? (
              <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{flagsState.error}</p>
            ) : flags.length ? (
              flags.slice(0, 10).map((flag) => (
                <div key={flag.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{formatEnumLabel(flag.type)}</p>
                      <p className="mt-2 text-xs text-white/45">
                        Org {flag.orgId}
                        {flag.userId ? ` · User ${flag.userId}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill
                        value={formatEnumLabel(flag.severity)}
                        tone={flag.severity.toLowerCase().includes("high") ? "red" : flag.severity.toLowerCase().includes("medium") ? "amber" : "blue"}
                      />
                      <StatusPill value={formatEnumLabel(flag.status)} tone={toneFromStatus(flag.status)} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/40">
                    {formatDateTime(flag.createdAt)}
                    {flag.resolvedAt ? ` · Resolved ${formatDateTime(flag.resolvedAt)}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState title="No recent abuse flags" description="The current platform snapshot does not contain any flagged organizations." />
            )}
          </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
