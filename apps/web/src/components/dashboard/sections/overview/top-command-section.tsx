import Link from "next/link";
import { ErrorNotice } from "../../operational-shared";
import { ReadoutGrid, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import { HelpHint, RadioCardGroup } from "../../../ui";
import { BranchHoursEditor } from "../branch-hours-editor";
import { formatCompactNumber, formatDate, formatDaysRemaining, formatEnumLabel, formatInr } from "@/lib/format";
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
      <Link
        href="/dashboard/reports"
        className="zook-focus inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:bg-white/10"
      >
        Open reports
      </Link>
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
    <div className="grid gap-3 md:grid-cols-2">
      <input
        value={branchForm.name}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, name: event.target.value }))
        }
        placeholder="Branch name"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={branchForm.address}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, address: event.target.value }))
        }
        placeholder="Address"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={branchForm.city}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, city: event.target.value }))
        }
        placeholder="City"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={branchForm.state}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, state: event.target.value }))
        }
        placeholder="State"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <div className="grid grid-cols-[1fr_92px] gap-3">
        <input
          value={branchForm.pincode}
          onChange={(event) =>
            setBranchForm((current) => ({ ...current, pincode: event.target.value }))
          }
          placeholder="Pincode"
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <button
          onClick={() => void createBranch()}
          disabled={formBusy === "branch"}
          className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          Add
        </button>
      </div>
      <input
        value={branchForm.contactPhone}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, contactPhone: event.target.value }))
        }
        placeholder="Branch phone"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={branchForm.contactEmail}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, contactEmail: event.target.value }))
        }
        placeholder="Branch email"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={branchForm.whatsappNumber}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, whatsappNumber: event.target.value }))
        }
        placeholder="WhatsApp number"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <label id="branch-manager-picker" className="grid gap-2 text-sm text-white/62">
        <span className="flex items-center gap-2">
          Branch manager
          <HelpHint label="Branch manager" title="Branch manager">
            Optional but recommended. Manager receives owner-level alerts for this branch and is the
            default contact on the public page.
          </HelpHint>
        </span>
        <select
        value={branchForm.managerId}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, managerId: event.target.value }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="" className="bg-black">
          No manager assigned
        </option>
        {staffAssignments
          .filter(
            (assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN",
          )
          .map((assignment) => (
            <option key={assignment.userId} value={assignment.userId} className="bg-black">
              {staffUsersById.get(assignment.userId)?.name ??
                staffUsersById.get(assignment.userId)?.email ??
                "Team member"}
            </option>
          ))}
        </select>
      </label>
      <input
        value={branchForm.amenitiesText}
        onChange={(event) =>
          setBranchForm((current) => ({ ...current, amenitiesText: event.target.value }))
        }
        placeholder="Amenities, comma separated"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
      />
      <BranchHoursEditor
        value={branchForm.hoursText}
        onChange={(hoursText) => setBranchForm((current) => ({ ...current, hoursText }))}
        compact
      />
      <div className="grid gap-2 md:col-span-2">
        <span className="flex items-center gap-2 text-sm text-white/62">
          Commerce setup
          <HelpHint label="Commerce setup" title="Commerce setup">
            Shared sells the org catalogue. Custom lets this branch use its own pricing and SKUs
            before members are attached.
          </HelpHint>
        </span>
        <RadioCardGroup
          name="branch-commerce-setup"
          label="Commerce setup"
          value={branchForm.commerceSetup ?? "SHARED"}
          onChange={(value) =>
            setBranchForm((current) => ({
              ...current,
              commerceSetup: value as "SHARED" | "CUSTOM",
            }))
          }
          options={[
            {
              value: "SHARED",
              label: "Use current plans and products",
              description: "Branch sells the org plan and shop catalogue.",
            },
            {
              value: "CUSTOM",
              label: "Set separate pricing later",
              description: "Branch can use its own pricing and SKUs before launch.",
            },
          ]}
        />
      </div>
    </div>
    {branches.length === 0 && !branchesState.loading ? (
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
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={branchEditForm.name}
                onChange={(event) =>
                  setBranchEditForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Branch name"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchEditForm.address}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Address"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchEditForm.city}
                onChange={(event) =>
                  setBranchEditForm((current) => ({ ...current, city: event.target.value }))
                }
                placeholder="City"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchEditForm.state}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="State"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <input
                  value={branchEditForm.pincode}
                  onChange={(event) =>
                    setBranchEditForm((current) => ({
                      ...current,
                      pincode: event.target.value,
                    }))
                  }
                  placeholder="Pincode"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <button
                  onClick={() => void saveBranchEdit(branch)}
                  disabled={formBusy === `branch:${branch.id}`}
                  className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                >
                  Save
                </button>
              </div>
              <input
                value={branchEditForm.contactPhone}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
                placeholder="Branch phone"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchEditForm.contactEmail}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    contactEmail: event.target.value,
                  }))
                }
                placeholder="Branch email"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchEditForm.whatsappNumber}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    whatsappNumber: event.target.value,
                  }))
                }
                placeholder="WhatsApp number"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <select
                value={branchEditForm.managerId}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    managerId: event.target.value,
                  }))
                }
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="bg-black">
                  No manager assigned
                </option>
                {staffAssignments
                  .filter(
                    (assignment) =>
                      assignment.role === "OWNER" || assignment.role === "ADMIN",
                  )
                  .map((assignment) => (
                    <option
                      key={assignment.userId}
                      value={assignment.userId}
                      className="bg-black"
                    >
                      {staffUsersById.get(assignment.userId)?.name ??
                        staffUsersById.get(assignment.userId)?.email ??
                        "Team member"}
                    </option>
                  ))}
              </select>
              <input
                value={branchEditForm.amenitiesText}
                onChange={(event) =>
                  setBranchEditForm((current) => ({
                    ...current,
                    amenitiesText: event.target.value,
                  }))
                }
                placeholder="Amenities, comma separated"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
              />
              <BranchHoursEditor
                value={branchEditForm.hoursText}
                onChange={(hoursText) =>
                  setBranchEditForm((current) => ({ ...current, hoursText }))
                }
                compact
              />
            </div>
            <button
              onClick={() => setEditingBranchId(null)}
              className="zook-focus justify-self-start rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
            >
              Cancel
            </button>
          </div>
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
                  .join(" · ") ||
                  "Add phone, hours, and manager before opening this branch"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <StatusPill
                value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"}
                tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"}
              />
              <button
                onClick={() => startBranchEdit(branch)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
              >
                Edit
              </button>
              {!branch.isDefault ? (
                <>
                  <button
                    onClick={() =>
                      void updateBranch(branch, { isDefault: true, active: true })
                    }
                    disabled={formBusy === `branch:${branch.id}`}
                    className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 disabled:opacity-50"
                  >
                    Make default
                  </button>
                  {branch.active ? (
                    <button
                      onClick={() => void deactivateBranch(branch)}
                      disabled={formBusy === `branch:${branch.id}:delete`}
                      className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</GlassCard>
    </>
  );
}
