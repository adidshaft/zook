import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { GlassCard, Pill } from "../glass-card";
import { HelpHint, ManagedOn } from "../ui";
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{copy.shopPickup}</h1>
          <p className="mt-1 text-sm text-white/48">{copy.pickupDescription}</p>
          <ManagedOn surface="desk" className="mt-3">
            Verify identity in person before handover.
          </ManagedOn>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-white/45">
            Sort
            <select
              value={orderSort}
              onChange={(event) =>
                onOrderSortChange(event.target.value as "newest" | "oldest" | "status")
              }
              className="zook-focus ml-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">Status</option>
            </select>
          </label>
          <Pill>
            {fulfilledToday} {copy.fulfilledToday}
          </Pill>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {activeOrders.map((order) => {
          const verified = verifiedOrderIds.includes(order.id);
          const codeSkipped = skippedCodeOrderIds.includes(order.id);
          const payAtDesk = order.status === "PENDING_PAYMENT" && !order.paymentId;
          return (
            <div
              key={order.id}
              className={`rounded-[22px] border p-4 ${
                highlightedOrderId === order.id
                  ? "border-lime-300/40 bg-lime-300/8"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="font-medium text-white">{order.user?.name ?? "Member"}</p>
                  <p className="mt-1 text-xs text-white/35">
                    Order {order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Created {formatDateTime(order.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-white/48">{orderItemsSummary(order)}</p>
                  {order.pickupCode ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/42">
                      {copy.pickupCode}: hidden
                      <HelpHint label="Pickup code" title="Pickup code" size="xs">
                        Code is sent to the member by SMS. Reveal it only after verifying their
                        identity at the desk.
                      </HelpHint>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone={toneForPickupOrderStatus(order.status)}>
                      {formatEnumLabel(order.status)}
                    </Pill>
                    <Pill tone={payAtDesk ? "amber" : "lime"}>
                      {payAtDesk ? copy.payAtDesk : copy.paid}
                    </Pill>
                    <Pill>{formatInr(order.totalPaise)}</Pill>
                    {verified ? <Pill tone="lime">{copy.codeVerified}</Pill> : null}
                    {codeSkipped ? <Pill tone="amber">{copy.codeSkipped}</Pill> : null}
                  </div>
                  {codeSkipped ? (
                    <p className="mt-2 text-xs text-amber-100/70">Code override reason recorded.</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    disabled={busyId === `verify:${order.id}` || payAtDesk}
                    state={busyId === `verify:${order.id}` ? "loading" : "idle"}
                    onClick={() => onVerifyPickupCode(order)}
                  >
                    {copy.verifyCode}
                  </ZookButton>
                  {payAtDesk ? (
                    <ZookButton
                      type="button"
                      tone="secondary"
                      size="sm"
                      disabled={busyId === `pay:${order.id}`}
                      state={busyId === `pay:${order.id}` ? "loading" : "idle"}
                      onClick={() => onJumpToShopPayment(order)}
                    >
                      {copy.recordPayment}
                    </ZookButton>
                  ) : null}
                  {!payAtDesk && !verified && !codeSkipped ? (
                    <ZookButton
                      type="button"
                      tone="ghost"
                      size="sm"
                      onClick={() => {
                        const reason = window.prompt("Why is the pickup code being skipped?")?.trim();
                        if (reason) onSkipCode(order.id, reason);
                      }}
                    >
                      {copy.skipCode}
                    </ZookButton>
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
