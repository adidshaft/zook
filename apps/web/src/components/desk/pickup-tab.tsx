import { formatDateTime, formatInr } from "@/lib/format";
import { GlassCard } from "../glass-card";
import { HelpHint } from "../ui";
import { ZookButton } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { ShopOrder } from "./types";
import { orderItemsSummary } from "./utils";

function toneForPickupOrderStatus(status: ShopOrder["status"]) {
  if (status === "READY_FOR_PICKUP" || status === "PAID") return "lime";
  if (status === "PENDING_PAYMENT") return "amber";
  if (["CANCELLED", "FAILED", "REFUNDED"].includes(status)) return "red";
  if (status === "FULFILLED") return "blue";
  return "neutral";
}

function pickupOrderStatusLabel(status: ShopOrder["status"]) {
  if (status === "PENDING_PAYMENT") return "Payment pending";
  if (status === "READY_FOR_PICKUP") return "Ready for pickup";
  if (status === "FULFILLED") return "Picked up";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "FAILED") return "Failed";
  if (status === "REFUNDED") return "Refunded";
  if (status === "PAID") return "Paid";
  return "Review order";
}

function statusMarkClass(tone: ReturnType<typeof toneForPickupOrderStatus>) {
  if (tone === "lime") return "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]";
  if (tone === "amber") return "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]";
  if (tone === "red") return "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]";
  if (tone === "blue") return "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]";
  return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]";
}

function PickupStatusMark({ status }: { status: ShopOrder["status"] }) {
  const label = pickupOrderStatusLabel(status);
  const tone = toneForPickupOrderStatus(status);
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${statusMarkClass(tone)}`}
    >
      <span aria-hidden>
        {status === "FULFILLED" ? "✓" : status === "PENDING_PAYMENT" ? "…" : status === "READY_FOR_PICKUP" || status === "PAID" ? "✓" : "!"}
      </span>
    </span>
  );
}

function CompactStateMark({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "lime" | "amber" | "neutral";
  children: string;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border px-2 text-[0.65rem] font-bold ${statusMarkClass(tone)}`}
    >
      <span aria-hidden>{children}</span>
    </span>
  );
}

export function PickupTab({
  copy,
  activeOrders,
  orderSort,
  fulfilledToday,
  verifiedOrderIds,
  skippedCodeOrderIds,
  busyId,
  onVerifyPickupCode,
  onOrderSortChange,
  onSkipCode,
  onJumpToShopPayment,
  onFulfillOrder,
  highlightedOrderId,
}: {
  copy: DeskCopy;
  activeOrders: ShopOrder[];
  orderSort: "newest" | "oldest" | "status";
  fulfilledToday: number;
  verifiedOrderIds: string[];
  skippedCodeOrderIds: string[];
  busyId: string;
  onVerifyPickupCode: (order: ShopOrder) => void;
  onOrderSortChange: (sort: "newest" | "oldest" | "status") => void;
  onSkipCode: (orderId: string, reason: string) => void;
  onJumpToShopPayment: (order: ShopOrder) => void;
  onFulfillOrder: (orderId: string) => void;
  highlightedOrderId?: string | undefined;
}) {
  return (
    <GlassCard>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-white">{copy.shopPickup}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/48">{copy.pickupDescription}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:justify-end">
          <label className="sr-only" htmlFor="pickup-order-sort">
            {copy.sortOrders}
          </label>
          <select
            id="pickup-order-sort"
            aria-label={copy.sortOrders}
            value={orderSort}
            onChange={(event) =>
              onOrderSortChange(event.target.value as "newest" | "oldest" | "status")
            }
            className="zook-focus h-9 rounded-full border border-white/10 bg-black/35 px-3 text-xs font-semibold text-white outline-none transition hover:bg-white/8"
          >
            <option value="newest">{copy.newestFirst}</option>
            <option value="oldest">{copy.oldestFirst}</option>
            <option value="status">{copy.statusFirst}</option>
          </select>
          <span
            aria-label={`${fulfilledToday} ${copy.fulfilledToday}`}
            title={`${fulfilledToday} ${copy.fulfilledToday}`}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white"
          >
            {fulfilledToday}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {activeOrders.map((order) => {
          const verified = verifiedOrderIds.includes(order.id);
          const codeSkipped = skippedCodeOrderIds.includes(order.id);
          const payAtDesk = order.status === "PENDING_PAYMENT" && !order.paymentId;
          return (
            <div
              key={order.id}
              className={`rounded-2xl border px-3 py-3 ${
                highlightedOrderId === order.id
                  ? "border-white/20 bg-white/8"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-white">{order.user?.name ?? "Member"}</p>
                    <span className="text-xs font-semibold text-white/45">#{order.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-white/42">
                    {formatInr(order.totalPaise)} · {orderItemsSummary(order)} · {formatDateTime(order.createdAt)}
                  </p>
                  {order.pickupCode && !payAtDesk ? (
                    <p className="mt-1.5 inline-flex items-center gap-2 text-xs text-white/42">
                      {copy.pickupCodeSent}
                      <HelpHint label={copy.pickupCode} title={copy.pickupCode} size="xs">
                        {copy.pickupCodeHelp}
                      </HelpHint>
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <PickupStatusMark status={order.status} />
                    <CompactStateMark label={payAtDesk ? copy.payAtDesk : copy.paid} tone={payAtDesk ? "amber" : "neutral"}>
                      {payAtDesk ? "₹!" : "₹✓"}
                    </CompactStateMark>
                    {verified ? (
                      <CompactStateMark label={copy.codeVerified} tone="lime">
                        ✓
                      </CompactStateMark>
                    ) : null}
                    {codeSkipped ? (
                      <CompactStateMark label={copy.codeSkipped} tone="amber">
                        !
                      </CompactStateMark>
                    ) : null}
                  </div>
                  {codeSkipped ? (
                    <p className="mt-2 text-xs text-amber-100/70">Code override reason recorded.</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {payAtDesk ? (
                    <ZookButton
                      type="button"
                      size="sm"
                      disabled={busyId === `pay:${order.id}`}
                      state={busyId === `pay:${order.id}` ? "loading" : "idle"}
                      onClick={() => onJumpToShopPayment(order)}
                    >
                      {copy.recordPayment}
                    </ZookButton>
                  ) : null}
                  {!payAtDesk ? (
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      disabled={busyId === `verify:${order.id}` || verified || codeSkipped}
                      state={busyId === `verify:${order.id}` ? "loading" : "idle"}
                      onClick={() => onVerifyPickupCode(order)}
                    >
                      {verified ? copy.codeVerified : copy.verifyCode}
                    </ZookButton>
                  ) : null}
                  {!payAtDesk && !verified && !codeSkipped ? (
                    <button
                      type="button"
                      aria-label={copy.skipCode}
                      title={copy.skipCode}
                      className="zook-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-transparent text-xs font-semibold text-white/45 transition hover:bg-white/8 hover:text-white active:translate-y-px"
                      onClick={() => {
                        const reason = window.prompt(copy.skipCodeReasonPrompt)?.trim();
                        if (reason) onSkipCode(order.id, reason);
                      }}
                    >
                      <span aria-hidden>!</span>
                    </button>
                  ) : null}
                  <ZookButton
                    type="button"
                    size="sm"
                    disabled={busyId === order.id || payAtDesk || (!verified && !codeSkipped)}
                    state={busyId === order.id ? "loading" : "idle"}
                    onClick={() => onFulfillOrder(order.id)}
                  >
                    {copy.markFulfilled}
                  </ZookButton>
                </div>
              </div>
            </div>
          );
        })}
        {!activeOrders.length ? (
          <p className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-white/48">
            {copy.noPickupOrders}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}
