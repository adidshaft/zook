import { DataTable, ReadoutGrid, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import { ZookButton } from "../zook-button";
import { formatCompactNumber, formatDate, formatEnumLabel } from "@/lib/format";

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
  orgId: string;
};

type PlatformUsageRow = {
  id: string;
};

export function PlatformOrganizationsSection({
  show,
  organizations,
  selectedOrganization,
  suspendedOrganizations,
  trialRiskOrganizations,
  openFlags,
  usage,
  statusError,
  organizationsError,
  busyOrgId,
  onSelectOrganization,
  onCloseOrganization,
  onOpenStatusDialog,
  onOpenOrganizationAction,
}: {
  show: boolean;
  organizations: PlatformOrganization[];
  selectedOrganization: PlatformOrganization | null;
  suspendedOrganizations: PlatformOrganization[];
  trialRiskOrganizations: PlatformOrganization[];
  openFlags: PlatformAbuseFlag[];
  usage: PlatformUsageRow[];
  statusError: string;
  organizationsError?: string | null;
  busyOrgId: string | null;
  onSelectOrganization: (org: PlatformOrganization) => void;
  onCloseOrganization: () => void;
  onOpenStatusDialog: (org: PlatformOrganization, status: "ACTIVE" | "SUSPENDED" | "CANCELLED") => void;
  onOpenOrganizationAction: (
    kind: "extend-trial" | "credit" | "tier" | "rename" | "import-members" | "transfer-owner" | "archive",
    org: PlatformOrganization,
  ) => void;
}) {
  if (!show) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
      <div id="organizations" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Organizations"
            title="Gym accounts"
            badge={
              <Pill tone={suspendedOrganizations.length ? "amber" : "neutral"}>
                {suspendedOrganizations.length} suspended
              </Pill>
            }
          />
          {statusError ? (
            <div className="mt-5">
              <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {statusError}
              </p>
            </div>
          ) : null}
          {organizationsError ? (
            <div className="mt-5">
              <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {organizationsError}
              </p>
            </div>
          ) : null}
          <div className="mt-5">
            <DataTable
              columns={[
                {
                  id: "org",
                  header: "Gym",
                  render: (org) => (
                    <div>
                      <p className="font-medium text-white">{org.name}</p>
                      <p className="mt-1 text-xs text-white/45">@{org.username}</p>
                    </div>
                  ),
                },
                {
                  id: "city",
                  header: "Location",
                  render: (org) => `${org.city}${org.state ? `, ${org.state}` : ""}`,
                },
                {
                  id: "join",
                  header: "Join mode",
                  render: (org) => formatEnumLabel(org.joinMode),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (org) => <StatusPill value={formatEnumLabel(org.status)} />,
                },
                {
                  id: "trial",
                  header: "Trial end",
                  render: (org) => formatDate(org.trialEndAt),
                },
                {
                  id: "actions",
                  header: "Actions",
                  render: (org) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      <ZookButton tone="ghost" size="sm" onClick={() => onSelectOrganization(org)}>
                        Details
                      </ZookButton>
                      {org.status !== "ACTIVE" ? (
                        <ZookButton
                          tone="ghost"
                          size="sm"
                          onClick={() => onOpenStatusDialog(org, "ACTIVE")}
                          disabled={busyOrgId === org.id}
                        >
                          Activate
                        </ZookButton>
                      ) : (
                        <ZookButton
                          tone="ghost"
                          size="sm"
                          onClick={() => onOpenStatusDialog(org, "SUSPENDED")}
                          disabled={busyOrgId === org.id}
                        >
                          Suspend
                        </ZookButton>
                      )}
                    </div>
                  ),
                  align: "right",
                },
              ]}
              rows={organizations}
              rowKey={(org) => org.id}
              empty="No accounts."
            />
          </div>
          {selectedOrganization ? (
            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                    Gym account details
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{selectedOrganization.name}</h3>
                  <p className="mt-1 text-sm text-white/55">@{selectedOrganization.username}</p>
                </div>
                <ZookButton tone="ghost" size="sm" onClick={onCloseOrganization}>
                  Close
                </ZookButton>
              </div>
              <ReadoutGrid
                className="mt-4"
                columns={3}
                items={[
                  {
                    label: "Status",
                    value: formatEnumLabel(selectedOrganization.status),
                    meta: "Platform account status",
                  },
                  {
                    label: "Join mode",
                    value: formatEnumLabel(selectedOrganization.joinMode),
                    meta: "How members enter the gym",
                  },
                  {
                    label: "Trial end",
                    value: formatDate(selectedOrganization.trialEndAt),
                    meta: trialRiskOrganizations.some((org) => org.id === selectedOrganization.id)
                      ? "Needs renewal follow-up"
                      : "No immediate trial risk",
                  },
                  {
                    label: "Location",
                    value: `${selectedOrganization.city}${
                      selectedOrganization.state ? `, ${selectedOrganization.state}` : ""
                    }`,
                    meta: "Primary market",
                  },
                  {
                    label: "Contact",
                    value:
                      selectedOrganization.contactEmail ??
                      selectedOrganization.contactPhone ??
                      "Not captured",
                    meta: "Support handoff",
                  },
                  {
                    label: "Created",
                    value: formatDate(selectedOrganization.createdAt),
                    meta: openFlags.some((flag) => flag.orgId === selectedOrganization.id)
                      ? "Has open safety review"
                      : "No open safety review",
                  },
                ]}
              />
              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Account actions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["ACTIVE", "SUSPENDED", "CANCELLED"] as const).map((nextStatus) => (
                    <ZookButton
                      key={nextStatus}
                      tone={nextStatus === "CANCELLED" ? "danger" : "ghost"}
                      size="sm"
                      onClick={() => onOpenStatusDialog(selectedOrganization, nextStatus)}
                      disabled={busyOrgId === selectedOrganization.id || selectedOrganization.status === nextStatus}
                    >
                      {nextStatus === "ACTIVE"
                        ? "Activate"
                        : nextStatus === "SUSPENDED"
                          ? "Suspend"
                          : "Cancel"}
                    </ZookButton>
                  ))}
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("extend-trial", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Extend trial
                  </ZookButton>
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("credit", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Credit
                  </ZookButton>
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("tier", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Tier
                  </ZookButton>
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("rename", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Rename
                  </ZookButton>
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("import-members", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Import CSV
                  </ZookButton>
                  <ZookButton
                    tone="danger"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("transfer-owner", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id}
                  >
                    Transfer owner
                  </ZookButton>
                  <ZookButton
                    tone="danger"
                    size="sm"
                    onClick={() => onOpenOrganizationAction("archive", selectedOrganization)}
                    disabled={busyOrgId === selectedOrganization.id || selectedOrganization.status === "DELETED"}
                  >
                    Archive
                  </ZookButton>
                </div>
              </div>
            </div>
          ) : null}
        </GlassCard>
      </div>

      <div className="grid gap-4">
        <GlassCard>
          <SectionHeader eyebrow="Watchlist" title="Safety review" />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Open safety reviews",
                value: formatCompactNumber(openFlags.length),
                meta: "Reports still waiting for review",
              },
              {
                label: "Paused gyms",
                value: formatCompactNumber(suspendedOrganizations.length),
                meta: "Paused by the platform team",
              },
              {
                label: "Recent assistant activity",
                value: formatCompactNumber(usage.length),
                meta: "Recent assisted drafts across gyms",
              },
            ]}
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader eyebrow="Contacts" title="Gym contact list" />
          <div className="mt-5 grid gap-3">
            {organizations.slice(0, 4).map((org) => (
              <div key={org.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">{org.name}</p>
                <p className="mt-2 text-sm text-white/55">
                  {org.contactEmail ?? org.contactPhone ?? "No contact captured"}
                </p>
                <p className="mt-2 text-xs text-white/40">Created {formatDate(org.createdAt)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
