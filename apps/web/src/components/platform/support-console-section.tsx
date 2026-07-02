import { DataTable, ReadoutGrid, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "../glass-card";
import { ZookButton } from "../zook-button";
import { formatCompactNumber, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";

type PlatformUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isPlatformAdmin?: boolean;
};

type PlatformPaymentRow = {
  id: string;
  orgId?: string | null;
  userId?: string | null;
  amountPaise: number;
  status: string;
  provider?: string | null;
  providerRef?: string | null;
  createdAt: string | Date;
};

type PlatformUserDetail = {
  user: PlatformUserRow & {
    phone?: string | null;
  };
  sessions: Array<{ id: string }>;
  organizations: Array<{
    orgId: string;
    status: string;
    roles: string[];
    organization?: {
      name: string;
    } | null;
  }>;
  payments: PlatformPaymentRow[];
};

type PlatformPaymentDetail = {
  payment: PlatformPaymentRow & {
    receiptNumber?: string | null;
  };
  user: PlatformUserRow | null;
  organization: { name: string } | null;
  refunds: Array<{
    amountPaise: number;
  }>;
  events: Array<{
    id: string;
    type?: string | null;
    status?: string | null;
    providerEventId?: string | null;
    processingError?: string | null;
    createdAt: string | Date;
  }>;
};

export function PlatformSupportConsoleSection({
  showUsers,
  showPayments,
  supportNotice,
  usersLoading,
  usersError,
  userRows,
  userQuery,
  selectedUser,
  userDetailBusyId,
  paymentsLoading,
  paymentsError,
  paymentRows,
  paymentQuery,
  selectedPayment,
  paymentDetailBusyId,
  onUserQueryChange,
  onPaymentQueryChange,
  onSearchUsers,
  onSearchPayments,
  onLoadUserDetails,
  onCloseUserDetails,
  onRevokeUserSessions,
  onOpenImpersonationDialog,
  onLoadPaymentDetails,
  onClosePaymentDetails,
  onOpenRefundDialog,
}: {
  showUsers: boolean;
  showPayments: boolean;
  supportNotice: { message: string; tone: PillTone } | null;
  usersLoading: boolean;
  usersError?: string | null;
  userRows: PlatformUserRow[];
  userQuery: string;
  selectedUser: PlatformUserDetail | null;
  userDetailBusyId: string | null;
  paymentsLoading: boolean;
  paymentsError?: string | null;
  paymentRows: PlatformPaymentRow[];
  paymentQuery: string;
  selectedPayment: PlatformPaymentDetail | null;
  paymentDetailBusyId: string | null;
  onUserQueryChange: (query: string) => void;
  onPaymentQueryChange: (query: string) => void;
  onSearchUsers: () => void;
  onSearchPayments: () => void;
  onLoadUserDetails: (userId: string) => void;
  onCloseUserDetails: () => void;
  onRevokeUserSessions: (userId: string) => void;
  onOpenImpersonationDialog: (user: PlatformUserRow) => void;
  onLoadPaymentDetails: (paymentId: string) => void;
  onClosePaymentDetails: () => void;
  onOpenRefundDialog: (payment: PlatformPaymentRow) => void;
}) {
  if (!showUsers && !showPayments) return null;

  return (
    <div id="support-console" className="scroll-mt-5">
      <GlassCard>
        <SectionHeader
          eyebrow="Support"
          title="Platform support console"
          badge={supportNotice ? <Pill tone={supportNotice.tone}>{supportNotice.message}</Pill> : undefined}
        />
        <div className={`mt-5 grid gap-4 ${showUsers && showPayments ? "xl:grid-cols-2" : ""}`}>
          {showUsers ? (
            <div id="users" className="scroll-mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <SectionHeader
                eyebrow="Users"
                title="User search and details"
                badge={
                  <Pill tone={usersLoading ? "amber" : "neutral"}>
                    {usersLoading && !userRows.length ? "Loading" : `${userRows.length} visible`}
                  </Pill>
                }
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                  value={userQuery}
                  onChange={(event) => onUserQueryChange(event.target.value)}
                  placeholder="Email, phone, or name"
                />
                <ZookButton size="sm" onClick={onSearchUsers}>
                  Search users
                </ZookButton>
              </div>
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: "user",
                      header: "User",
                      render: (user) => (
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="mt-1 text-xs text-white/45">{user.email}</p>
                          {user.phone ? <p className="mt-1 text-xs text-white/45">{user.phone}</p> : null}
                        </div>
                      ),
                    },
                    {
                      id: "kind",
                      header: "Kind",
                      render: (user) => (
                        <StatusPill
                          value={user.isPlatformAdmin ? "Platform admin" : "User"}
                          tone={user.isPlatformAdmin ? "amber" : "blue"}
                        />
                      ),
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      align: "right",
                      render: (user) => (
                        <div className="flex flex-wrap justify-end gap-2">
                          <ZookButton
                            size="sm"
                            tone="ghost"
                            disabled={userDetailBusyId === user.id}
                            onClick={() => onLoadUserDetails(user.id)}
                          >
                            Details
                          </ZookButton>
                          <ZookButton size="sm" tone="ghost" onClick={() => onRevokeUserSessions(user.id)}>
                            Revoke
                          </ZookButton>
                          <ZookButton
                            size="sm"
                            tone="danger"
                            disabled={Boolean(user.isPlatformAdmin)}
                            onClick={() => onOpenImpersonationDialog(user)}
                          >
                            Impersonate
                          </ZookButton>
                        </div>
                      ),
                    },
                  ]}
                  rows={userRows}
                  rowKey={(user) => user.id}
                  empty={usersError || "No users match this search."}
                />
              </div>
              {selectedUser ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                        User details
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{selectedUser.user.name}</h3>
                      <p className="mt-1 text-sm text-white/55">{selectedUser.user.email}</p>
                      {selectedUser.user.phone ? (
                        <p className="mt-1 text-sm text-white/45">{selectedUser.user.phone}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/8 hover:text-white"
                      onClick={onCloseUserDetails}
                    >
                      Close
                    </button>
                  </div>
                  <ReadoutGrid
                    className="mt-4"
                    columns={3}
                    items={[
                      {
                        label: "Gym links",
                        value: formatCompactNumber(selectedUser.organizations.length),
                        meta: "Active and historical links",
                      },
                      {
                        label: "Payments",
                        value: formatCompactNumber(selectedUser.payments.length),
                        meta: "Recent payment records",
                      },
                      {
                        label: "Sessions",
                        value: formatCompactNumber(selectedUser.sessions.length),
                        meta: "Recent auth sessions",
                      },
                    ]}
                  />
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Gym access
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedUser.organizations.length ? (
                          selectedUser.organizations.slice(0, 6).map((membership) => (
                            <div key={membership.orgId} className="rounded-2xl bg-white/[0.04] p-3">
                              <p className="font-medium text-white">
                                {membership.organization?.name ?? membership.orgId}
                              </p>
                              <p className="mt-1 text-xs text-white/45">
                                {membership.roles.map(formatEnumLabel).join(", ") || "No roles"} ·{" "}
                                {formatEnumLabel(membership.status)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No gym access.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Recent payments
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedUser.payments.length ? (
                          selectedUser.payments.slice(0, 6).map((payment) => (
                            <button
                              type="button"
                              key={payment.id}
                              className="zook-focus rounded-2xl bg-white/[0.04] p-3 text-left"
                              onClick={() => onLoadPaymentDetails(payment.id)}
                            >
                              <p className="font-medium text-white">{formatInr(payment.amountPaise)}</p>
                              <p className="mt-1 text-xs text-white/45">
                                {formatEnumLabel(payment.status)} · {formatDateTime(payment.createdAt)}
                              </p>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No payments for this user.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showPayments ? (
            <div id="payments" className="scroll-mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <SectionHeader
                eyebrow="Payments"
                title="Payment records"
                badge={
                  <Pill tone={paymentsLoading ? "amber" : "neutral"}>
                    {paymentsLoading && !paymentRows.length ? "Loading" : `${paymentRows.length} visible`}
                  </Pill>
                }
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                  value={paymentQuery}
                  onChange={(event) => onPaymentQueryChange(event.target.value)}
                  placeholder="Payment id, phone, amount"
                />
                <ZookButton size="sm" onClick={onSearchPayments}>
                  Search payments
                </ZookButton>
              </div>
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: "payment",
                      header: "Payment",
                      render: (payment) => (
                        <div>
                          <p className="font-medium text-white">{payment.id}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {payment.providerRef ?? payment.provider ?? "Manual entry"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "amount",
                      header: "Amount",
                      render: (payment) => formatInr(payment.amountPaise),
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (payment) => <StatusPill value={formatEnumLabel(payment.status)} />,
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      align: "right",
                      render: (payment) => (
                        <div className="flex flex-wrap justify-end gap-2">
                          <ZookButton
                            size="sm"
                            tone="ghost"
                            disabled={paymentDetailBusyId === payment.id}
                            onClick={() => onLoadPaymentDetails(payment.id)}
                          >
                            Details
                          </ZookButton>
                          <ZookButton size="sm" tone="ghost" onClick={() => onOpenRefundDialog(payment)}>
                            Refund
                          </ZookButton>
                        </div>
                      ),
                    },
                  ]}
                  rows={paymentRows}
                  rowKey={(payment) => payment.id}
                  empty={paymentsError || "No payments match this search."}
                />
              </div>
              {selectedPayment ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                        Payment details
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">
                        {formatInr(selectedPayment.payment.amountPaise)}
                      </h3>
                      <p className="mt-1 text-sm text-white/55">{selectedPayment.payment.id}</p>
                    </div>
                    <button
                      type="button"
                      className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/8 hover:text-white"
                      onClick={onClosePaymentDetails}
                    >
                      Close
                    </button>
                  </div>
                  <ReadoutGrid
                    className="mt-4"
                    columns={3}
                    items={[
                      {
                        label: "Status",
                        value: formatEnumLabel(selectedPayment.payment.status),
                        meta: selectedPayment.payment.provider ?? "Manual entry",
                      },
                      {
                        label: "Refunds",
                        value: formatCompactNumber(selectedPayment.refunds.length),
                        meta: selectedPayment.refunds.length
                          ? `${formatInr(
                              selectedPayment.refunds.reduce((sum, refund) => sum + refund.amountPaise, 0),
                            )} total`
                          : "No refund records",
                      },
                      {
                        label: "Events",
                        value: formatCompactNumber(selectedPayment.events.length),
                        meta: "Payment events",
                      },
                    ]}
                  />
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Context
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-white/60">
                        <p>
                          Gym:{" "}
                          <span className="text-white">
                            {selectedPayment.organization?.name ?? selectedPayment.payment.orgId ?? "None"}
                          </span>
                        </p>
                        <p>
                          User:{" "}
                          <span className="text-white">
                            {selectedPayment.user?.email ?? selectedPayment.payment.userId ?? "None"}
                          </span>
                        </p>
                        <p>
                          Created:{" "}
                          <span className="text-white">{formatDateTime(selectedPayment.payment.createdAt)}</span>
                        </p>
                        {selectedPayment.payment.receiptNumber ? (
                          <p>
                            Receipt: <span className="text-white">{selectedPayment.payment.receiptNumber}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Events
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedPayment.events.length ? (
                          selectedPayment.events.slice(0, 6).map((event) => (
                            <div key={event.id} className="rounded-2xl bg-white/[0.04] p-3">
                              <p className="font-medium text-white">
                                {formatEnumLabel(event.type ?? event.status ?? "event")}
                              </p>
                              <p className="mt-1 text-xs text-white/45">
                                {event.providerEventId ?? event.id} · {formatDateTime(event.createdAt)}
                              </p>
                              {event.processingError ? (
                                <p className="mt-1 text-xs text-red-100">{event.processingError}</p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No payment events recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
