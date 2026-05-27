import Link from "next/link";
import { ErrorNotice } from "../../operational-shared";
import { ConfirmActionButton } from "../../../confirm-action-button";
import { ReadoutGrid, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import { ZookButton, ZookButtonLink } from "../../../zook-button";
import { BranchForm } from "../branch-form";
import {
  formatCompactNumber,
  formatDate,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import type { OverviewOperationalSectionProps } from "./types";

type TopCommandSectionProps = Pick<
  OverviewOperationalSectionProps,
  | "organization"
  | "summary"
  | "overviewWorkflowCards"
  | "branches"
  | "branchesState"
  | "branchForm"
  | "setBranchForm"
  | "editingBranchId"
  | "setEditingBranchId"
  | "branchEditForm"
  | "setBranchEditForm"
  | "staffAssignments"
  | "staffUsersById"
  | "formBusy"
  | "createBranch"
  | "saveBranchEdit"
  | "startBranchEdit"
  | "updateBranch"
  | "deactivateBranch"
>;

export function TopCommandSection({
  organization,
  summary,
  overviewWorkflowCards,
  branches,
  branchesState,
  branchForm,
  setBranchForm,
  editingBranchId,
  setEditingBranchId,
  branchEditForm,
  setBranchEditForm,
  staffAssignments,
  staffUsersById,
  formBusy,
  createBranch,
  saveBranchEdit,
  startBranchEdit,
  updateBranch,
  deactivateBranch,
}: TopCommandSectionProps) {
  const trialUrgent =
    organization.status === "TRIAL" &&
    summary.trialDaysRemaining !== null &&
    summary.trialDaysRemaining !== undefined &&
    summary.trialDaysRemaining <= 3;
  const missingManagerCount = branches.filter((branch) => !branch.managerId).length;

  return (
    <>
      {trialUrgent ? (
        <GlassCard className="border-amber-300/28 bg-amber-300/10">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-amber-50">
                Trial ends in {summary.trialDaysRemaining}{" "}
                {summary.trialDaysRemaining === 1 ? "day" : "days"}.
              </p>
              <p className="mt-1 text-sm text-amber-50/70">
                Add billing before pilot traffic so the owner dashboard stays active.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="zook-focus inline-flex rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-black"
            >
              Upgrade now
            </Link>
          </div>
        </GlassCard>
      ) : null}
      <GlassCard>
        <SectionHeader
          eyebrow="Today"
          title="Daily command grid"
          description="Today's check-ins, revenue, stock, and member requests in one view."
          badge={<StatusPill value={formatEnumLabel(organization.status)} />}
          action={
            <ZookButtonLink
              tone="ghost"
              size="sm"
              href="/dashboard/reports"
            >
              Open reports
            </ZookButtonLink>
          }
        />
        <ReadoutGrid
          className="mt-5"
          columns={3}
          items={[
            {
              label: "Active members",
              value: formatCompactNumber(summary.activeMembers),
              meta: `${summary.joinRequests} inbound requests`,
            },
            {
              label: "Attendance today",
              value: formatCompactNumber(summary.todayAttendance),
              meta: "QR check-ins with entry codes",
            },
            {
              label: "Revenue",
              value: formatInr(summary.revenuePaise),
              meta: `${formatInr(summary.cashCollectedPaise)} collected at desk`,
            },
            {
              label: "Low stock",
              value: formatCompactNumber(summary.lowStockProducts),
              meta: "Pickup inventory risk",
            },
            {
              label: "Notification queue",
              value:
                summary.notificationQueueCount > 0
                  ? `${summary.notificationQueueCount} waiting`
                  : "Clear",
              meta: "Failed or scheduled sends",
            },
            {
              label: "Trial runway",
              value: formatDaysRemaining(summary.trialDaysRemaining),
              meta: formatDate(organization.trialEndAt),
            },
          ]}
        />
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Next Up"
          title="Shift watchlist"
          description="Quick links to what needs attention today."
        />
        <div className="mt-5 grid gap-3">
          {overviewWorkflowCards.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{item.label}</p>
                <Pill tone={item.tone}>{item.detail}</Pill>
              </div>
              {item.href.includes("attendance") ? (
                <span className="mt-3 inline-flex rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black">
                  Review now
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Branches"
          title="Location control"
          description="You have one branch by default. Add another branch when this gym expands."
          badge={
            <span className="flex flex-wrap items-center gap-2">
              <Pill tone={branches.length > 1 ? "blue" : "neutral"}>
                {branches.length || 1} branches
              </Pill>
              {missingManagerCount ? (
                <a
                  href="#branch-manager-picker"
                  className="zook-focus rounded-full border border-amber-300/28 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-50"
                >
                  {missingManagerCount} need manager
                </a>
              ) : null}
            </span>
          }
        />
        <div className="mt-5 grid gap-3">
          {branchesState.error ? <ErrorNotice message={branchesState.error} /> : null}
          <BranchForm
            mode="create"
            variant="compact"
            form={branchForm}
            setForm={setBranchForm}
            onSubmit={() => void createBranch()}
            formBusy={formBusy === "branch"}
            staffAssignments={staffAssignments}
            staffUsersById={staffUsersById}
          />  {branches.length === 0 && !branchesState.loading ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
              Branches will appear here once the location API responds.
            </p>
          ) : null}
          {branches.slice(0, 6).map((branch) => (
            <div
              key={branch.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              {editingBranchId === branch.id ? (
                <BranchForm
                  mode="edit"
                  variant="full"
                  form={branchEditForm}
                  setForm={setBranchEditForm}
                  onSubmit={() => void saveBranchEdit(branch)}
                  onCancel={() => setEditingBranchId(null)}
                  formBusy={formBusy === `branch:${branch.id}`}
                  staffAssignments={staffAssignments}
                  staffUsersById={staffUsersById}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{branch.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {branch.address} · {branch.city}, {branch.state} {branch.pincode}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {[
                        branch.contactPhone,
                        branch.contactEmail,
                        branch.managerId ? "Manager assigned" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Add phone, hours, and manager before opening this branch"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusPill
                      value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"}
                      tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"}
                    />
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => startBranchEdit(branch)}
                    >
                      Edit
                    </ZookButton>
                    {!branch.isDefault ? (
                      <>
                        <ZookButton
                          type="button"
                          tone="ghost"
                          size="sm"
                          onClick={() =>
                            void updateBranch(branch, { isDefault: true, active: true })
                          }
                          disabled={formBusy === `branch:${branch.id}`}
                          state={formBusy === `branch:${branch.id}` ? "loading" : "idle"}
                        >
                          Make default
                        </ZookButton>
                        {branch.active ? (
                          <ConfirmActionButton
                            title="Deactivate branch?"
                            description="Existing attendance, payments, and history stay intact. The branch stops appearing in active operational flows."
                            confirmLabel="Deactivate"
                            onConfirm={() => deactivateBranch(branch)}
                            disabled={formBusy === `branch:${branch.id}:delete`}
                            className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50"
                          >
                            Deactivate
                          </ConfirmActionButton>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
          {branches.length > 6 ? (
            <Link
              href="/dashboard/branches"
              className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
            >
              {branches.length - 6} more branches →
            </Link>
          ) : null}
        </div>
      </GlassCard>
    </>
  );
}
