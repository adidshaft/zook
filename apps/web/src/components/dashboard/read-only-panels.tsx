"use client";

import { useState } from "react";
import { AttendanceApprovalsPanel } from "../attendance-approvals-panel";
import { AttendanceQrPanel } from "../attendance-qr-panel";
import {
  NotificationComposerPanel,
  NotificationHistoryPanel,
  NotificationTemplateManagerPanel,
} from "../notification-composer-panel";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import type {
  AIUsageRow,
  AttendanceRecordRow,
  AuditLogRow,
  BranchScopeSnapshot,
  CoachPlanRow,
  MembershipPlanRow,
  NotificationSnapshot,
  OrganizationSnapshot,
  OrganizationSummary,
  PaymentRow,
  MemberRow,
  ShopOrderRow,
} from "../dashboard-operational-model";
import { webApiFetch } from "@/lib/api-client";
import {
  CsvExportButton,
  ErrorNotice,
  LoadMoreButton,
  formatAiResponseSummary,
} from "./operational-shared";

type LoadingState = {
  error: string;
  loading: boolean;
  reload?: () => void;
};

type PagedState = LoadingState & {
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reload?: () => void;
};

function formatPaymentMode(mode: string) {
  return mode === "MOCK_ONLINE" ? "Online" : formatEnumLabel(mode);
}

type PaymentReceiptState = {
  title: string;
  amountPaise: number;
  mode: string;
  reference?: string | undefined;
  recordedAt: string;
};

export function AttendancePanel({
  orgId,
  organization,
  summary,
  branchScope,
  selectedBranchName,
  attendanceRecords,
  attendanceState,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  attendanceRecords: AttendanceRecordRow[];
  attendanceState: PagedState;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <AttendanceApprovalsPanel orgId={orgId} />
        <div className="grid gap-4">
          <AttendanceQrPanel orgId={orgId} />
          <GlassCard>
            <SectionHeader
              eyebrow="Entry & attendance"
              title="QR code and entry codes"
              description="Members scan the displayed gym QR, receive a unique entry code, and show it at the floor or desk."
              badge={<StatusPill value="Self-approved QR" tone="lime" />}
            />
            <ReadoutGrid
              className="mt-5"
              items={[
                {
                  label: "Branch scope",
                  value: selectedBranchName,
                  meta: branchScope.selectedBranch
                    ? "QR and member attendance use this branch"
                    : "Set up your branch to start accepting members",
                },
                {
                  label: "Today scans",
                  value: formatCompactNumber(summary.todayAttendance),
                  meta: "Members receive visible entry codes",
                },
                {
                  label: "Join mode",
                  value: formatEnumLabel(organization.joinMode),
                  meta: "Used during membership requests",
                },
                {
                  label: "Trial window",
                  value: formatDaysRemaining(summary.trialDaysRemaining),
                  meta: formatDate(organization.trialEndAt),
                },
              ]}
              columns={1}
            />
          </GlassCard>
        </div>
      </div>
      <GlassCard>
        <SectionHeader
          eyebrow="Attendance"
          title="Recent attendance scans"
          description="A cursor-paged ledger of member check-ins for the selected organization."
          badge={<Pill tone="blue">{attendanceRecords.length} loaded</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/reports/attendance.csv`} />}
        />
        <div className="mt-5">
          {attendanceState.error ? (
            <ErrorNotice message={attendanceState.error} />
          ) : attendanceState.loading && attendanceRecords.length === 0 ? (
            <EmptyState title="Loading attendance" description="Pulling the latest check-in ledger." />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    id: "member",
                    header: "Member",
                    render: (record) => (
                      <div>
                        <p className="font-medium text-white">
                          {record.user?.name ?? record.user?.email ?? "Member"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {record.plan?.name ?? "Membership"}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (record) => <StatusPill value={formatEnumLabel(record.status)} />,
                  },
                  {
                    id: "remaining",
                    header: "Visits",
                    align: "right",
                    render: (record) =>
                      record.subscription?.remainingVisits === null ||
                      record.subscription?.remainingVisits === undefined
                        ? "Open"
                        : record.subscription.remainingVisits.toString(),
                  },
                  {
                    id: "time",
                    header: "Checked in",
                    render: (record) => formatDateTime(record.checkedInAt),
                  },
                ]}
                rows={attendanceRecords}
                rowKey={(record) => record.id}
                empty="No attendance scans are available yet."
              />
              <LoadMoreButton
                count={attendanceRecords.length}
                hasMore={attendanceState.hasMore}
                loading={attendanceState.loadingMore}
                onLoadMore={attendanceState.loadMore}
              />
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export function NotificationsPanel({
  orgId,
  organization,
  summary,
  initialNotifications,
  view = "compose",
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  initialNotifications: NotificationSnapshot[];
  view?: "compose" | "templates" | "history";
}) {
  if (view === "templates") {
    return <NotificationTemplateManagerPanel orgId={orgId} />;
  }

  if (view === "history") {
    return (
      <NotificationHistoryPanel
        orgId={orgId}
        initialNotifications={initialNotifications.map((notification) => ({
          ...notification,
          body: "",
          pushEnabled: true,
          createdAt:
            typeof notification.createdAt === "string"
              ? notification.createdAt
              : new Date(notification.createdAt).toISOString(),
        })) as Parameters<typeof NotificationHistoryPanel>[0]["initialNotifications"]}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <NotificationComposerPanel orgId={orgId} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Message limits"
            title="Delivery status"
            description="Operational messages should stay crisp, permission-safe, and relevant to the floor or membership journey."
            badge={
              <Pill tone={summary.notificationQueueCount > 0 ? "amber" : "lime"}>
                {summary.notificationQueueCount} queued
              </Pill>
            }
          />
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: "Org status",
                value: formatEnumLabel(organization.status),
                meta: "Broadcasts respect active org availability",
              },
              {
                label: "Recent sends",
                value: formatCompactNumber(initialNotifications.length),
                meta: "Current history in this org snapshot",
              },
              {
                label: "Audience",
                value:
                  summary.activeMembers > 0 ? "Live member targeting" : "No active audience yet",
                meta: "Live member list",
              },
              {
                label: "Escalation load",
                value:
                  summary.pendingAttendanceApprovals > 0
                    ? `${summary.pendingAttendanceApprovals} pending`
                    : "Clear",
                meta: "Useful for operational notices",
              },
            ]}
            columns={2}
          />
        </GlassCard>
        <GlassCard>
          <SectionHeader
            eyebrow="Recent Messages"
            title="Current message mix"
            description="A quick read on the most recent notifications coming out of this organization."
          />
          <div className="mt-5 grid gap-3">
            {initialNotifications.length ? (
              initialNotifications.slice(0, 4).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{notification.title}</p>
                    <StatusPill value={formatEnumLabel(notification.status)} />
                  </div>
                  <p className="mt-2 text-xs text-white/45">
                    {formatEnumLabel(notification.type)}
                    {notification.audience ? ` · ${formatEnumLabel(notification.audience)}` : ""}
                    {" · "}
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No notifications in history yet"
                description="You have not sent any messages yet. Compose one to update your members."
              />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export function PaymentsPanel({
  orgId,
  summary,
  queuedOrders,
  membershipPlans,
  members,
  payments,
  paymentsState,
  shopOrders,
  shopOrdersState,
}: {
  orgId: string;
  summary: OrganizationSummary;
  queuedOrders: ShopOrderRow[];
  membershipPlans: MembershipPlanRow[];
  members: MemberRow[];
  payments: PaymentRow[];
  paymentsState: PagedState;
  shopOrders: ShopOrderRow[];
  shopOrdersState: LoadingState;
}) {
  const [manualPayment, setManualPayment] = useState({
    memberUserId: "",
    planId: "",
    amountRupees: "",
    mode: "CASH",
    receiptNumber: "",
    notes: "",
  });
  const [manualPaymentStatus, setManualPaymentStatus] = useState("");
  const [manualPaymentBusy, setManualPaymentBusy] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<PaymentReceiptState | null>(null);

  async function recordOfflinePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setManualPaymentBusy(true);
      setManualPaymentStatus("");
      const amountPaise = Math.round(Number(manualPayment.amountRupees) * 100);
      const payload = await webApiFetch<{ payment?: PaymentRow }>(`/api/orgs/${orgId}/manual-payments`, {
        method: "POST",
        body: {
          memberUserId: manualPayment.memberUserId,
          planId: manualPayment.planId,
          amountPaise,
          mode: manualPayment.mode,
          receiptNumber: manualPayment.receiptNumber || undefined,
          notes: manualPayment.notes || undefined,
        },
      });
      setManualPaymentStatus(`Payment recorded for ${formatInr(amountPaise)}.`);
      setLastReceipt({
        title: "Membership payment",
        amountPaise,
        mode: manualPayment.mode,
        reference: manualPayment.receiptNumber || payload.payment?.receiptNumber || undefined,
        recordedAt: new Date().toISOString(),
      });
      setManualPayment((current) => ({ ...current, receiptNumber: "", notes: "" }));
      paymentsState.reload?.();
    } catch (cause) {
      setManualPaymentStatus(cause instanceof Error ? cause.message : "Unable to record payment.");
    } finally {
      setManualPaymentBusy(false);
    }
  }

  async function recordShopOrderPayment(order: ShopOrderRow) {
    const reference = window.prompt("Reference number or UPI ID, if available", "") ?? "";
    try {
      setManualPaymentBusy(true);
      setManualPaymentStatus("");
      await webApiFetch(`/api/orgs/${orgId}/shop/orders/${order.id}/manual-payment`, {
        method: "POST",
        body: {
          amountPaise: order.totalPaise,
          mode: "DIRECT_UPI",
          receiptNumber: reference || undefined,
          notes: "Recorded from the owner payment queue.",
        },
      });
      setManualPaymentStatus(`Shop payment recorded for ${formatInr(order.totalPaise)}.`);
      setLastReceipt({
        title: `Shop order ${order.id.slice(-8).toUpperCase()}`,
        amountPaise: order.totalPaise,
        mode: "DIRECT_UPI",
        reference: reference || undefined,
        recordedAt: new Date().toISOString(),
      });
      paymentsState.reload?.();
      shopOrdersState.reload?.();
    } catch (cause) {
      setManualPaymentStatus(cause instanceof Error ? cause.message : "Unable to record shop payment.");
    } finally {
      setManualPaymentBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Collected at the desk</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatInr(summary.cashCollectedPaise)}
          </div>
          <p className="mt-2 text-xs text-white/55">Cash, UPI, card, and bank transfers recorded today.</p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Successful revenue</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatInr(summary.revenuePaise)}
          </div>
          <p className="mt-2 text-xs text-white/55">Current settled revenue signal for today.</p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Pending shop payments</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatCompactNumber(queuedOrders.length)}
          </div>
          <p className="mt-2 text-xs text-white/55">
            Orders waiting for payment or pickup.
          </p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Expiring memberships</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatCompactNumber(summary.expiringMemberships)}
          </div>
          <p className="mt-2 text-xs text-white/55">A useful renewal queue for the front desk.</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Payments"
            title="Payments ledger"
            description="Membership, shop, online, and desk payments are shown in this gym's ledger."
            badge={<Pill tone="blue">{payments.length} loaded</Pill>}
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/payments.csv`} />}
          />
          <div className="mt-5">
            {paymentsState.error ? (
              <ErrorNotice message={paymentsState.error} />
            ) : paymentsState.loading && payments.length === 0 ? (
              <EmptyState title="Loading payments" description="Pulling recent payment records." />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      id: "member",
                      header: "Member",
                      render: (payment) => (
                        <div>
                          <p className="font-medium text-white">
                            {payment.user?.name ?? payment.user?.email ?? "Walk-in or system"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {formatEnumLabel(payment.purpose)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (payment) => <StatusPill value={formatEnumLabel(payment.status)} />,
                    },
                    {
                      id: "mode",
                      header: "Mode",
                      render: (payment) => formatPaymentMode(payment.mode),
                    },
                    {
                      id: "recorded",
                      header: "Recorded",
                      render: (payment) => formatDateTime(payment.recordedAt ?? payment.createdAt),
                    },
                    {
                      id: "amount",
                      header: "Amount",
                      align: "right",
                      render: (payment) => (
                        <span className="font-medium text-white">
                          {formatInr(payment.amountPaise)}
                        </span>
                      ),
                    },
                  ]}
                  rows={payments}
                  rowKey={(payment) => payment.id}
                  empty={
                    <EmptyState
                      title="No payments yet"
                      description="Payments appear here when members buy memberships or shop pickups."
                    />
                  }
                />
                <LoadMoreButton
                  count={payments.length}
                  hasMore={paymentsState.hasMore}
                  loading={paymentsState.loadingMore}
                  onLoadMore={paymentsState.loadMore}
                />
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Record offline payment"
            title="Collected at the desk"
            description="Use this for cash, UPI, card, or bank transfer membership payments."
          />
          <form className="mt-5 grid gap-3" onSubmit={(event) => void recordOfflinePayment(event)}>
            <select
              value={manualPayment.memberUserId}
              onChange={(event) =>
                setManualPayment((current) => ({ ...current, memberUserId: event.target.value }))
              }
              className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
              required
            >
              <option value="" className="bg-black">
                Choose member
              </option>
              {members.map((member) => (
                <option key={member.profile.id} value={member.user?.id ?? ""} className="bg-black">
                  {member.user?.name ?? member.user?.email ?? "Member"}
                </option>
              ))}
            </select>
            <select
              value={manualPayment.planId}
              onChange={(event) => {
                const plan = membershipPlans.find((candidate) => candidate.id === event.target.value);
                setManualPayment((current) => ({
                  ...current,
                  planId: event.target.value,
                  amountRupees: plan ? String(plan.pricePaise / 100) : current.amountRupees,
                }));
              }}
              className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
              required
            >
              <option value="" className="bg-black">
                Choose plan
              </option>
              {membershipPlans
                .filter((plan) => plan.active)
                .map((plan) => (
                  <option key={plan.id} value={plan.id} className="bg-black">
                    {plan.name} - {formatInr(plan.pricePaise)}
                  </option>
                ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={manualPayment.amountRupees}
                onChange={(event) =>
                  setManualPayment((current) => ({ ...current, amountRupees: event.target.value }))
                }
                inputMode="decimal"
                placeholder="Amount"
                className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
                required
              />
              <select
                value={manualPayment.mode}
                onChange={(event) =>
                  setManualPayment((current) => ({ ...current, mode: event.target.value }))
                }
                className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
              >
                <option value="CASH" className="bg-black">
                  Cash
                </option>
                <option value="DIRECT_UPI" className="bg-black">
                  UPI
                </option>
                <option value="CARD" className="bg-black">
                  Card
                </option>
                <option value="BANK_TRANSFER" className="bg-black">
                  Bank transfer
                </option>
              </select>
            </div>
            <input
              value={manualPayment.receiptNumber}
              onChange={(event) =>
                setManualPayment((current) => ({ ...current, receiptNumber: event.target.value }))
              }
              placeholder="Reference number"
              className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
            />
            <textarea
              value={manualPayment.notes}
              onChange={(event) =>
                setManualPayment((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Notes"
              className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button
              type="submit"
              disabled={manualPaymentBusy}
              className="zook-focus min-h-11 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {manualPaymentBusy ? "Recording..." : "Record payment"}
            </button>
            {manualPaymentStatus ? (
              <p className="text-sm text-white/58">{manualPaymentStatus}</p>
            ) : null}
          </form>
          {lastReceipt ? (
            <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-lime-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/70">
                Receipt ready
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{lastReceipt.title}</p>
              <div className="mt-3 grid gap-2 text-sm text-white/65">
                <p>Amount: {formatInr(lastReceipt.amountPaise)}</p>
                <p>Mode: {formatPaymentMode(lastReceipt.mode)}</p>
                <p>Reference: {lastReceipt.reference || "Not added"}</p>
                <p>Recorded: {formatDateTime(lastReceipt.recordedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="zook-focus mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:bg-white/8"
              >
                Print receipt
              </button>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Settlement Queue"
            title="Orders affecting cashflow"
            description="Orders waiting for payment or pickup appear here."
            badge={
              <Pill tone={queuedOrders.length ? "amber" : "lime"}>
                {queuedOrders.length} unsettled
              </Pill>
            }
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
          />
          <div className="mt-5">
            {shopOrdersState.error ? (
              <ErrorNotice message={shopOrdersState.error} />
            ) : shopOrdersState.loading && shopOrders.length === 0 ? (
              <EmptyState
                title="Loading settlement queue"
                description="Pulling live shop order payment states."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "order",
                    header: "Order",
                    render: (order) => (
                      <div>
                        <p className="font-medium text-white">
                          {order.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (order) => <StatusPill value={formatEnumLabel(order.status)} />,
                  },
                  {
                    id: "items",
                    header: "Items",
                    align: "right",
                    render: (order) =>
                      order.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
                  },
                  {
                    id: "amount",
                    header: "Amount",
                    align: "right",
                    render: (order) => (
                      <span className="font-medium text-white">{formatInr(order.totalPaise)}</span>
                    ),
                  },
                  {
                    id: "actions",
                    header: "",
                    align: "right",
                    render: (order) =>
                      order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                        <button
                          type="button"
                          disabled={manualPaymentBusy}
                          onClick={() => void recordShopOrderPayment(order)}
                          className="zook-focus rounded-full border border-lime-300/40 px-3 py-1 text-xs font-semibold text-lime-100 transition hover:bg-lime-300/10 disabled:opacity-50"
                        >
                          Record payment
                        </button>
                      ) : (
                        <span className="text-xs text-white/35">Settled</span>
                      ),
                  },
                ]}
                rows={shopOrders}
                rowKey={(order) => order.id}
                empty={
                  <EmptyState
                    title="No payments yet"
                    description="Payments appear here when members buy memberships or shop pickups."
                  />
                }
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Levers"
            title="Revenue opportunities"
            description="Renewals, low stock, and scheduled messages that may need attention."
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Renewal window",
                value: formatCompactNumber(summary.expiringMemberships),
                meta: "Members expiring in the next 7 days",
              },
              {
                label: "Inventory pressure",
                value: formatCompactNumber(summary.lowStockProducts),
                meta: "Products close to threshold",
              },
              {
                label: "Notification queue",
                value: formatCompactNumber(summary.notificationQueueCount),
                meta: "Messages still scheduled or failed",
              },
              {
                label: "Plan ladder",
                value: membershipPlans.length ? `${membershipPlans.length} live plans` : "Load plans",
                meta: "Useful while talking renewals at the desk",
              },
            ]}
          />
        </GlassCard>
      </div>
    </div>
  );
}

export function ReportsPanel({
  organization,
  summary,
  selectedBranchName,
  auditLogCount,
}: {
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  selectedBranchName: string;
  auditLogCount: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Daily summary"
          title="Operational report pack"
          description="Memberships, floor activity, and revenue in one report."
        />
        <ReadoutGrid
          className="mt-5"
          columns={2}
          items={[
            {
              label: "Branch scope",
              value: selectedBranchName,
              meta: "Attendance and memberships can be filtered by branch",
            },
            {
              label: "Active members",
              value: formatCompactNumber(summary.activeMembers),
              meta: `${summary.joinRequests} join requests pending`,
            },
            {
              label: "Attendance today",
              value: formatCompactNumber(summary.todayAttendance),
              meta: "QR check-ins with entry codes",
            },
            {
              label: "Revenue today",
              value: formatInr(summary.revenuePaise),
              meta: `${formatInr(summary.cashCollectedPaise)} manual or offline`,
            },
            {
              label: "Assistant drafts",
              value: formatCompactNumber(summary.aiUsageThisMonth),
              meta: "This month",
            },
            {
              label: "Low stock",
              value: formatCompactNumber(summary.lowStockProducts),
              meta: "Products below threshold",
            },
            {
              label: "Trial runway",
              value: formatDaysRemaining(summary.trialDaysRemaining),
              meta: formatDate(organization.trialEndAt),
            },
          ]}
        />
      </GlassCard>

      <div className="grid gap-4">
        <GlassCard>
          <SectionHeader
            eyebrow="Governance"
            title="Control status"
            description="Review admin changes, pending messages, and unresolved checks."
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Audit log",
                value: formatCompactNumber(auditLogCount),
                meta: "Admin changes saved in Zook",
              },
              {
                label: "Notification queue",
                value:
                  summary.notificationQueueCount > 0
                    ? `${summary.notificationQueueCount} needs attention`
                    : "Clear",
                meta: "Scheduled or failed messages",
              },
              {
                label: "Join mode",
                value: formatEnumLabel(organization.joinMode),
                meta: "Shapes how inbound demand converts",
              },
            ]}
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Operator Notes"
            title="What deserves a second look"
            description="Quick prompts for keeping daily work tidy."
          />
          <div className="mt-5 grid gap-3">
            {[
              "Cross-check expiring memberships with the membership ladder before the evening rush.",
              "If flagged attendance exceptions spike, send an operational notification before it becomes member-visible.",
              "Review activity history and assistant drafts when sensitive trainer or member actions happen.",
            ].map((note) => (
              <div
                key={note}
                className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/58"
              >
                {note}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export function AuditPanel({
  orgId,
  auditLogs,
  auditLogsState,
  auditLogCount,
  aiUsage,
  aiUsageState,
  misconfiguredAiCount,
}: {
  orgId: string;
  auditLogs: AuditLogRow[];
  auditLogsState: PagedState;
  auditLogCount: number;
  aiUsage: AIUsageRow[];
  aiUsageState: LoadingState;
  misconfiguredAiCount: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Activity"
          title="Admin activity"
          description="Sensitive changes, who made them, and when they happened."
          badge={<Pill tone="blue">{auditLogs.length || auditLogCount} entries</Pill>}
          action={<CsvExportButton href={`/api/orgs/${orgId}/audit-logs.csv`} />}
        />
        <div className="mt-5">
          {auditLogsState.error ? (
            <ErrorNotice message={auditLogsState.error} />
          ) : auditLogsState.loading && auditLogs.length === 0 ? (
            <EmptyState title="Loading activity" description="Getting the latest admin actions." />
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    id: "action",
                    header: "Action",
                    render: (log) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(log.action)}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatEnumLabel(log.entityType)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "actor",
                    header: "Actor",
                    render: (log) => (log.actorUserId ? "Team member" : "System"),
                  },
                  {
                    id: "entity",
                    header: "Record",
                    render: (log) => (log.entityId ? "Linked record" : "Not attached"),
                  },
                  {
                    id: "time",
                    header: "Created",
                    render: (log) => formatDateTime(log.createdAt),
                  },
                ]}
                rows={auditLogs}
                rowKey={(log) => log.id}
                empty="No admin activity is available yet."
              />
              <LoadMoreButton
                count={auditLogs.length}
                hasMore={auditLogsState.hasMore}
                loading={auditLogsState.loadingMore}
                onLoadMore={auditLogsState.loadMore}
              />
            </>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Assistant"
          title="Recent assistant drafts"
          description="Review assisted drafts before anything member-facing is published."
          badge={
            <Pill tone={misconfiguredAiCount > 0 ? "amber" : "lime"}>
              {misconfiguredAiCount} need review
            </Pill>
          }
        />
        <div className="mt-5 grid gap-3">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState
              title="Loading drafts"
              description="Getting the latest assisted drafts for this gym."
            />
          ) : aiUsage.length ? (
            aiUsage.slice(0, 8).map((usage) => (
              <div key={usage.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{usage.promptSummary}</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill value={formatEnumLabel(usage.requestType)} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {formatAiResponseSummary(usage.responseSummary)}
                </p>
                <p className="mt-3 text-xs text-white/40">
                  {formatEnumLabel(usage.role)} · {formatDateTime(usage.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No assistant drafts yet"
              description="Assisted drafts will appear here after the team starts using the planner."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export function AiPanel({
  summary,
  aiUsage,
  aiUsageState,
  coachPlans,
  misconfiguredAiCount,
}: {
  summary: OrganizationSummary;
  aiUsage: AIUsageRow[];
  aiUsageState: LoadingState;
  coachPlans: CoachPlanRow[];
  misconfiguredAiCount: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <SectionHeader
          eyebrow="Assistant"
          title="Draft summaries"
          description="Assisted drafts, categories, and review notes for this gym."
          badge={<Pill tone="blue">{aiUsage.length} drafts</Pill>}
        />
        <div className="mt-5">
          {aiUsageState.error ? (
            <ErrorNotice message={aiUsageState.error} />
          ) : aiUsageState.loading && aiUsage.length === 0 ? (
            <EmptyState
              title="Loading drafts"
              description="Getting the latest assisted drafts for this gym."
            />
          ) : (
            <DataTable
              columns={[
                {
                  id: "summary",
                  header: "Prompt",
                  render: (usage) => (
                    <div>
                      <p className="font-medium text-white">{usage.promptSummary}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatAiResponseSummary(usage.responseSummary)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "shape",
                  header: "Category",
                  render: (usage) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(usage.requestType)} />
                    </div>
                  ),
                },
                {
                  id: "tokens",
                  header: "Detail",
                  align: "right",
                  render: (usage) => (usage.tokenEstimate > 0 ? "Detailed" : "Short"),
                },
                {
                  id: "cost",
                  header: "Cost",
                  align: "right",
                  render: (usage) => formatInr(usage.costEstimatePaise),
                },
              ]}
              rows={aiUsage}
              rowKey={(usage) => usage.id}
              empty="No assistant drafts are available for this gym yet."
            />
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          eyebrow="Draft output"
          title="Assisted content"
          description="A quick view of whether assisted work is becoming real coaching output."
        />
        <ReadoutGrid
          className="mt-5"
          columns={1}
          items={[
            {
              label: "Usage this month",
              value: formatCompactNumber(summary.aiUsageThisMonth),
              meta: "Assisted drafts this month",
            },
            {
              label: "Review cues",
              value:
                misconfiguredAiCount > 0 ? `${misconfiguredAiCount} drafts need review` : "Clear",
              meta: "Based on draft review signals",
            },
            {
              label: "Assisted plans",
              value: coachPlans.filter((plan) => plan.aiGenerated).length
                ? `${coachPlans.filter((plan) => plan.aiGenerated).length} plans`
                : "No assisted plans yet",
              meta: "Reviewable training content created so far",
            },
          ]}
        />
      </GlassCard>
    </div>
  );
}
