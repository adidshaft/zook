import type { Dispatch, SetStateAction } from "react";

import { ActionModal, FormDialog } from "../ui";
import { formatEnumLabel } from "@/lib/format";

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

export type CsvMemberPreview = {
  name: string;
  email: string;
  phone?: string;
};

export type OrganizationActionKind =
  | "extend-trial"
  | "credit"
  | "tier"
  | "rename"
  | "import-members"
  | "transfer-owner"
  | "archive";

export type OrganizationActionDialog = {
  kind: OrganizationActionKind;
  org: PlatformOrganization;
  name: string;
  username: string;
  tier: string;
  days: string;
  rupees: string;
  newOwnerUserId: string;
  csv: string;
  reason: string;
  confirmation: string;
};

export type OrganizationStatusDialog = {
  org: PlatformOrganization;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  confirmation: string;
};

export type BroadcastComposeDialog = {
  title: string;
  body: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  status: "DRAFT" | "SCHEDULED" | "LIVE";
};

export type SupportActionDialog =
  | {
      kind: "impersonate";
      userId: string;
      label: string;
      reason: string;
      confirmation: string;
    }
  | {
      kind: "refund";
      paymentId: string;
      label: string;
      reason: string;
      confirmation: string;
    };

export type ModerationDecisionDialog = {
  flagId: string;
  label: string;
  decision: "APPROVED" | "REMOVED";
  reason: string;
};

const platformInputClass =
  "min-h-10 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/25";

export function previewMemberCsv(csv: string): { rows: CsvMemberPreview[]; error?: string | undefined } {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [] };
  const headers = lines[0]!.split(",").map((header) => header.trim().toLowerCase());
  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const phoneIndex = headers.indexOf("phone");
  if (nameIndex < 0 || emailIndex < 0) {
    return { rows: [], error: "CSV must include name and email columns." };
  }
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return {
      name: cells[nameIndex] ?? "",
      email: cells[emailIndex] ?? "",
      ...(phoneIndex >= 0 && cells[phoneIndex] ? { phone: cells[phoneIndex] } : {}),
    };
  });
  return { rows };
}

export function PlatformOperationDialogs({
  organizationActionDialog,
  organizationStatusDialog,
  broadcastComposeDialog,
  supportActionDialog,
  moderationDecisionDialog,
  busyOrgId,
  broadcastBusyId,
  moderationBusyId,
  setOrganizationActionDialog,
  setOrganizationStatusDialog,
  setBroadcastComposeDialog,
  setSupportActionDialog,
  setModerationDecisionDialog,
  onSubmitOrganizationAction,
  onSubmitOrganizationStatus,
  onSubmitBroadcast,
  onSubmitSupportAction,
  onSubmitModerationDecision,
}: {
  organizationActionDialog: OrganizationActionDialog | null;
  organizationStatusDialog: OrganizationStatusDialog | null;
  broadcastComposeDialog: BroadcastComposeDialog | null;
  supportActionDialog: SupportActionDialog | null;
  moderationDecisionDialog: ModerationDecisionDialog | null;
  busyOrgId: string | null;
  broadcastBusyId: string | null;
  moderationBusyId: string | null;
  setOrganizationActionDialog: Dispatch<SetStateAction<OrganizationActionDialog | null>>;
  setOrganizationStatusDialog: Dispatch<SetStateAction<OrganizationStatusDialog | null>>;
  setBroadcastComposeDialog: Dispatch<SetStateAction<BroadcastComposeDialog | null>>;
  setSupportActionDialog: Dispatch<SetStateAction<SupportActionDialog | null>>;
  setModerationDecisionDialog: Dispatch<SetStateAction<ModerationDecisionDialog | null>>;
  onSubmitOrganizationAction: () => void;
  onSubmitOrganizationStatus: () => void;
  onSubmitBroadcast: () => void;
  onSubmitSupportAction: () => void;
  onSubmitModerationDecision: () => void;
}) {
  const memberImportPreview =
    organizationActionDialog?.kind === "import-members"
      ? previewMemberCsv(organizationActionDialog.csv)
      : null;

  return (
    <>
      {organizationActionDialog ? (
        <ActionModal
          open
          eyebrow="Gym account action"
          title={
            organizationActionDialog.kind === "extend-trial"
              ? "Extend trial"
              : organizationActionDialog.kind === "credit"
                ? "Adjust credit"
                : organizationActionDialog.kind === "tier"
                  ? "Change tier"
                  : organizationActionDialog.kind === "rename"
                    ? "Rename gym"
                    : organizationActionDialog.kind === "import-members"
                      ? "Import members"
                      : organizationActionDialog.kind === "transfer-owner"
                        ? "Transfer owner"
                        : "Archive gym"
          }
          subtitle={organizationActionDialog.org.name}
          danger={
            organizationActionDialog.kind === "archive" ||
            organizationActionDialog.kind === "transfer-owner"
          }
          busy={busyOrgId === organizationActionDialog.org.id}
          onClose={() => setOrganizationActionDialog(null)}
          onSubmit={onSubmitOrganizationAction}
        >
          {organizationActionDialog.kind === "extend-trial" ? (
            <label className="grid gap-2 text-sm text-white/70">
              Days to extend
              <input
                className={platformInputClass}
                inputMode="numeric"
                value={organizationActionDialog.days}
                onChange={(event) =>
                  setOrganizationActionDialog({
                    ...organizationActionDialog,
                    days: event.target.value,
                  })
                }
              />
            </label>
          ) : null}

          {organizationActionDialog.kind === "credit" ? (
            <>
              <label className="grid gap-2 text-sm text-white/70">
                Credit adjustment in rupees
                <input
                  className={platformInputClass}
                  inputMode="decimal"
                  value={organizationActionDialog.rupees}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      rupees: event.target.value,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-white/70">
                Type CREDIT {organizationActionDialog.org.username}
                <input
                  className={platformInputClass}
                  value={organizationActionDialog.confirmation}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      confirmation: event.target.value,
                    })
                  }
                />
              </label>
            </>
          ) : null}

          {organizationActionDialog.kind === "tier" ? (
            <label className="grid gap-2 text-sm text-white/70">
              Tier
              <select
                className={platformInputClass}
                value={organizationActionDialog.tier}
                onChange={(event) =>
                  setOrganizationActionDialog({
                    ...organizationActionDialog,
                    tier: event.target.value,
                  })
                }
              >
                {["FREE", "STARTER", "GROWTH", "PRO"].map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {organizationActionDialog.kind === "rename" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-white/70">
                Gym name
                <input
                  className={platformInputClass}
                  value={organizationActionDialog.name}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-white/70">
                Username
                <input
                  className={platformInputClass}
                  value={organizationActionDialog.username}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      username: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ) : null}

          {organizationActionDialog.kind === "import-members" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="zook-focus flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8">
                  Choose CSV file
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void file.text().then((csv) =>
                        setOrganizationActionDialog({
                          ...organizationActionDialog,
                          csv,
                        }),
                      );
                    }}
                  />
                </label>
                {memberImportPreview?.rows.length ? (
                  <span className="text-xs text-white/55">
                    {memberImportPreview.rows.length} data rows
                  </span>
                ) : null}
              </div>
              <label className="grid gap-2 text-sm text-white/70">
                CSV
                <textarea
                  className={`${platformInputClass} min-h-36 py-3 font-mono text-xs`}
                  value={organizationActionDialog.csv}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      csv: event.target.value,
                    })
                  }
                  placeholder="name,email,phone&#10;Rahul Sharma,rahul@example.com,9876543210"
                />
              </label>
              {memberImportPreview?.error ? (
                <p className="rounded-2xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-xs text-red-100">
                  {memberImportPreview.error}
                </p>
              ) : memberImportPreview?.rows.length ? (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="grid grid-cols-[1fr_1.25fr_0.9fr] bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Phone</span>
                  </div>
                  {memberImportPreview.rows.slice(0, 5).map((row, index) => (
                    <div
                      key={`${row.email}-${index}`}
                      className="grid grid-cols-[1fr_1.25fr_0.9fr] border-t border-white/10 px-3 py-2 text-xs text-white/70"
                    >
                      <span className="truncate">{row.name || "Missing"}</span>
                      <span className="truncate">{row.email || "Missing"}</span>
                      <span className="truncate">{row.phone ?? "Optional"}</span>
                    </div>
                  ))}
                  {memberImportPreview.rows.length > 5 ? (
                    <p className="border-t border-white/10 px-3 py-2 text-xs text-white/45">
                      +{memberImportPreview.rows.length - 5} more rows
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {organizationActionDialog.kind === "transfer-owner" ? (
            <>
              <label className="grid gap-2 text-sm text-white/70">
                New owner user ID
                <input
                  className={platformInputClass}
                  value={organizationActionDialog.newOwnerUserId}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      newOwnerUserId: event.target.value,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-white/70">
                Type TRANSFER {organizationActionDialog.org.username}
                <input
                  className={platformInputClass}
                  value={organizationActionDialog.confirmation}
                  onChange={(event) =>
                    setOrganizationActionDialog({
                      ...organizationActionDialog,
                      confirmation: event.target.value,
                    })
                  }
                />
              </label>
            </>
          ) : null}

          {organizationActionDialog.kind === "archive" ? (
            <label className="grid gap-2 text-sm text-white/70">
              Type DELETE {organizationActionDialog.org.username}
              <input
                className={platformInputClass}
                value={organizationActionDialog.confirmation}
                onChange={(event) =>
                  setOrganizationActionDialog({
                    ...organizationActionDialog,
                    confirmation: event.target.value,
                  })
                }
              />
            </label>
          ) : null}

          {organizationActionDialog.kind !== "tier" &&
          organizationActionDialog.kind !== "import-members" ? (
            <label className="grid gap-2 text-sm text-white/70">
              Reason
              <textarea
                className={`${platformInputClass} min-h-24 py-3`}
                value={organizationActionDialog.reason}
                onChange={(event) =>
                  setOrganizationActionDialog({
                    ...organizationActionDialog,
                    reason: event.target.value,
                  })
                }
              />
            </label>
          ) : null}
        </ActionModal>
      ) : null}
      {organizationStatusDialog ? (
        <FormDialog
          open
          eyebrow="Gym status"
          title={`Change to ${formatEnumLabel(organizationStatusDialog.status)}`}
          subtitle={organizationStatusDialog.org.name}
          danger={organizationStatusDialog.status === "CANCELLED"}
          busy={busyOrgId === organizationStatusDialog.org.id}
          onClose={() => setOrganizationStatusDialog(null)}
          onSubmit={onSubmitOrganizationStatus}
          fields={[
            {
              name: "confirmation",
              type: "text",
              label: `Type ${organizationStatusDialog.status} ${organizationStatusDialog.org.username}`,
              value: organizationStatusDialog.confirmation,
              onChange: (confirmation) =>
                setOrganizationStatusDialog({ ...organizationStatusDialog, confirmation }),
            },
          ]}
        />
      ) : null}
      {broadcastComposeDialog ? (
        <FormDialog
          open
          eyebrow="Broadcast composer"
          title="New platform broadcast"
          subtitle="Create the message and choose its review state."
          busy={broadcastBusyId === "new"}
          onClose={() => setBroadcastComposeDialog(null)}
          onSubmit={onSubmitBroadcast}
          fields={[
            {
              name: "title",
              type: "text",
              label: "Title",
              value: broadcastComposeDialog.title,
              onChange: (title) => setBroadcastComposeDialog({ ...broadcastComposeDialog, title }),
            },
            {
              name: "body",
              type: "textarea",
              label: "Body",
              value: broadcastComposeDialog.body,
              rows: 5,
              onChange: (body) => setBroadcastComposeDialog({ ...broadcastComposeDialog, body }),
            },
            {
              name: "severity",
              type: "select",
              label: "Severity",
              value: broadcastComposeDialog.severity,
              options: ["INFO", "WARN", "CRITICAL"].map((severity) => ({
                label: severity,
                value: severity,
              })),
              onChange: (severity) =>
                setBroadcastComposeDialog({
                  ...broadcastComposeDialog,
                  severity: severity as BroadcastComposeDialog["severity"],
                }),
            },
            {
              name: "status",
              type: "select",
              label: "Status",
              value: broadcastComposeDialog.status,
              options: ["DRAFT", "SCHEDULED", "LIVE"].map((status) => ({
                label: status,
                value: status,
              })),
              onChange: (status) =>
                setBroadcastComposeDialog({
                  ...broadcastComposeDialog,
                  status: status as BroadcastComposeDialog["status"],
                }),
            },
          ]}
        />
      ) : null}
      {supportActionDialog ? (
        <FormDialog
          open
          eyebrow="Support action"
          title={supportActionDialog.kind === "impersonate" ? "Start impersonation" : "Submit refund"}
          subtitle={supportActionDialog.label}
          danger
          onClose={() => setSupportActionDialog(null)}
          onSubmit={onSubmitSupportAction}
          fields={[
            {
              name: "reason",
              type: "textarea",
              label: "Reason",
              value: supportActionDialog.reason,
              rows: 4,
              onChange: (reason) => setSupportActionDialog({ ...supportActionDialog, reason }),
            },
            {
              name: "confirmation",
              type: "text",
              label: `Type ${supportActionDialog.kind === "impersonate" ? "IMPERSONATE" : "REFUND"}`,
              value: supportActionDialog.confirmation,
              onChange: (confirmation) =>
                setSupportActionDialog({ ...supportActionDialog, confirmation }),
            },
          ]}
        />
      ) : null}
      {moderationDecisionDialog ? (
        <FormDialog
          open
          eyebrow="Moderation decision"
          title={
            moderationDecisionDialog.decision === "APPROVED"
              ? "Approve flagged content"
              : "Remove flagged content"
          }
          subtitle={moderationDecisionDialog.label}
          danger={moderationDecisionDialog.decision === "REMOVED"}
          busy={moderationBusyId === moderationDecisionDialog.flagId}
          onClose={() => setModerationDecisionDialog(null)}
          onSubmit={onSubmitModerationDecision}
          fields={[
            {
              name: "reason",
              type: "textarea",
              label: "Reason",
              value: moderationDecisionDialog.reason,
              rows: 4,
              onChange: (reason) =>
                setModerationDecisionDialog({ ...moderationDecisionDialog, reason }),
            },
          ]}
        />
      ) : null}
    </>
  );
}
