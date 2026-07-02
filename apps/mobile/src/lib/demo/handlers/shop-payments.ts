import { zookDemoFixtures } from "@zook/core/demo-fixtures";

import { getOfflineDemoSession } from "../../demo-mode";

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Orders placed during the session persist so checkout → pickup → history
// works end to end (newest first, ahead of the seeded fixture order).
type DemoCreatedOrder = {
  id: string;
  orgId: string;
  memberUserId: string;
  status: string;
  totalPaise: number;
  pickupCode: string | null;
  createdAt: string;
  items: Array<{ productId: string; quantity: number; unitPaise: number }>;
};

const demoCreatedOrders: DemoCreatedOrder[] = [];

function enrichOrder<
  T extends {
    memberUserId: string;
    items: Array<{ productId: string; quantity: number; unitPaise: number }>;
  },
>(order: T) {
  return {
    ...order,
    user: zookDemoFixtures.users.find((user) => user.id === order.memberUserId) ?? null,
    userId: order.memberUserId,
    items: order.items.map((item) => ({
      ...item,
      product:
        zookDemoFixtures.shopProducts.find((product) => product.id === item.productId) ?? null,
    })),
  };
}

function demoCreateShopOrder(body: Record<string, unknown>) {
  const session = getOfflineDemoSession();
  const paymentMode = String(body.paymentMode ?? "ONLINE").toUpperCase();
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const productId = String(item.productId ?? "");
      const product = zookDemoFixtures.shopProducts.find((candidate) => candidate.id === productId);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return product
        ? { productId, quantity, unitPaise: product.pricePaise }
        : null;
    })
    .filter((item): item is { productId: string; quantity: number; unitPaise: number } =>
      Boolean(item),
    );
  const totalPaise = items.reduce((total, item) => total + item.unitPaise * item.quantity, 0);
  const order: DemoCreatedOrder = {
    id: `order-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    memberUserId: session.user.id,
    status: paymentMode === "DESK" ? "PENDING_PAYMENT" : "READY_FOR_PICKUP",
    totalPaise,
    pickupCode: paymentMode === "DESK" ? null : `PU-${String(1000 + Math.floor(Math.random() * 9000))}`,
    createdAt: nowIso(),
    items: items.length
      ? items
      : [{ productId: zookDemoFixtures.shopProducts[0]?.id ?? "product", quantity: 1, unitPaise: 14900 }],
  };
  for (const item of order.items) {
    const product = zookDemoFixtures.shopProducts.find((candidate) => candidate.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }
  demoCreatedOrders.unshift(order);
  return enrichOrder(order);
}

// --- Invoicing (offline demo) ----------------------------------------------
export function demoSucceededPayment() {
  return {
    id: "payment-hybrid-success",
    orgId: activeOrg()?.id ?? "org-demo",
    purpose: "MEMBERSHIP",
    amountPaise: 249900,
    status: "SUCCEEDED",
    mode: "DIRECT_UPI",
    paymentMode: "DIRECT_UPI",
    receiptNumber: "RC-2026-0042",
    recordedAt: hoursAgoIso(24 * 5),
    createdAt: hoursAgoIso(24 * 5),
  };
}

export function demoInvoices() {
  return [
    {
      id: "invoice-hybrid",
      orgId: activeOrg()?.id ?? "org-demo",
      paymentId: "payment-hybrid-success",
      invoiceNumber: "INV-2026-0042",
      invoiceNo: "INV-2026-0042",
      invoiceUrl: "/api/me/invoices/invoice-hybrid/pdf",
      issueDate: hoursAgoIso(24 * 5),
      issuedAt: hoursAgoIso(24 * 5),
      subtotalPaise: 211780,
      gstPaise: 38120,
      totalPaise: 249900,
      amountPaise: 249900,
      status: "ISSUED",
      invoiceStatus: "ISSUED",
    },
  ];
}

// Recent org payments (stateful) so refunds work end to end: refund flips the
// payment status to REFUNDED and it shows as refunded in the revenue list.
const demoRecentPayments: Array<Record<string, unknown>> = [
  {
    id: "payment-hybrid-success",
    orgId: "org-aarogya-strength",
    memberUserId: "user-aarav",
    user: { id: "user-aarav", name: "Nisha Menon" },
    purpose: "MEMBERSHIP",
    amountPaise: 249900,
    status: "SUCCEEDED",
    mode: "DIRECT_UPI",
    receiptNumber: "RC-2026-0042",
    createdAt: hoursAgoIso(24 * 5),
    recordedAt: hoursAgoIso(24 * 5),
  },
  {
    id: "payment-trial-success",
    orgId: "org-aarogya-strength",
    memberUserId: "user-riya",
    user: { id: "user-riya", name: "Ira Shah" },
    purpose: "MEMBERSHIP",
    amountPaise: 19900,
    status: "SUCCEEDED",
    mode: "CASH",
    receiptNumber: "RC-2026-0043",
    createdAt: hoursAgoIso(24 * 2),
    recordedAt: hoursAgoIso(24 * 2),
  },
  ...(zookDemoFixtures.payments.map((payment) => ({ ...payment })) as unknown as Array<
    Record<string, unknown>
  >),
];

function demoRefundPayment(paymentId: string, body: Record<string, unknown>) {
  const payment = demoRecentPayments.find((entry) => entry.id === paymentId);
  if (!payment) {
    throw new Error("Payment not found.");
  }
  payment.status = "REFUNDED";
  payment.refundedAt = nowIso();
  payment.refundReason = body.reason ? String(body.reason) : null;
  return { payment, refund: { id: `refund-${Date.now()}`, status: "REFUNDED" } };
}

export function demoPaymentDocument(paymentId: string, kind: "receipt" | "invoice") {
  if (kind === "receipt") {
    return {
      receiptNumber: "RC-2026-0042",
      receiptUrl: `/api/me/payments/${paymentId}/receipt/pdf`,
      payment: demoSucceededPayment(),
    };
  }
  const invoice = demoInvoices()[0];
  return {
    invoice,
    invoiceUrl: invoice.invoiceUrl,
    payment: demoSucceededPayment(),
  };
}

export function demoShopOrders() {
  return [...demoCreatedOrders, ...zookDemoFixtures.shopOrders].map((order) => enrichOrder(order));
}

export function shopPaymentsDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/shop-orders") return { orders: demoShopOrders() };

  if (pathname.endsWith("/products")) {
    return { products: zookDemoFixtures.shopProducts };
  }

  const refundMatch = pathname.match(/^\/orgs\/[^/]+\/payments\/([^/]+)\/refund$/);
  if (refundMatch && method === "POST") {
    return demoRefundPayment(refundMatch[1], demoBody(init));
  }

  if (pathname.endsWith("/payments/recent")) {
    return { payments: demoRecentPayments };
  }

  if (pathname.endsWith("/shop/orders/active")) {
    return {
      orders: demoShopOrders().filter(
        (order) =>
          order.status === "READY_FOR_PICKUP" ||
          order.status === "PAID" ||
          order.status === "PENDING_PAYMENT",
      ),
    };
  }

  if (pathname === "/shop/orders") {
    const body = demoBody(init);
    const order = demoCreateShopOrder(body);
    const paymentMode = String(body.paymentMode ?? "ONLINE").toUpperCase();
    return {
      order,
      checkoutUrl: paymentMode === "DESK" ? null : "",
      checkoutData: null,
      session:
        paymentMode === "DESK"
          ? null
          : { id: `offline-payment-${order.id}`, status: "SUCCEEDED", provider: "mock" },
      paymentMode,
    };
  }

  const shopManualPaymentMatch = pathname.match(/^\/orgs\/[^/]+\/shop\/orders\/([^/]+)\/manual-payment$/);
  if (shopManualPaymentMatch && method === "POST") {
    const order = demoCreatedOrders.find((candidate) => candidate.id === shopManualPaymentMatch[1]);
    if (!order) throw new Error("Shop order not found.");
    order.status = "READY_FOR_PICKUP";
    order.pickupCode = order.pickupCode ?? `PU-${String(1000 + Math.floor(Math.random() * 9000))}`;
    const payment = {
      id: `payment-shop-${Date.now()}`,
      orgId: activeOrg()?.id ?? "org-demo",
      memberUserId: order.memberUserId,
      purpose: "SHOP_ORDER",
      amountPaise: order.totalPaise,
      status: "SUCCEEDED",
      mode: String(demoBody(init).mode ?? "CASH"),
      receiptNumber: `RC-DEMO-${String(Date.now()).slice(-6)}`,
      createdAt: nowIso(),
      recordedAt: nowIso(),
    };
    demoRecentPayments.unshift(payment);
    return { payment, order: enrichOrder(order) };
  }

  if (pathname.startsWith("/payments/mock/")) {
    return {
      session: { id: "offline-payment-session", status: "SUCCEEDED" },
      payment: zookDemoFixtures.payments[0],
    };
  }

  const paymentSessionRefreshMatch = pathname.match(/^\/payments\/session\/([^/]+)\/refresh$/);
  if (paymentSessionRefreshMatch && method === "POST") {
    return { status: "SUCCEEDED" };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/subscriptions$/) && method === "POST") {
    return {
      checkoutUrl: "/checkout/mock/offline-membership",
      session: { id: `offline-sub-${Date.now()}`, status: "CREATED", provider: "mock" },
    };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/manual-payments$/) && method === "POST") {
    const body = demoBody(init);
    const payment = {
      id: `payment-manual-${Date.now()}`,
      orgId: activeOrg()?.id ?? "org-demo",
      memberUserId: String(body.memberUserId ?? "user-aarav"),
      purpose: String(body.purpose ?? "MEMBERSHIP"),
      amountPaise: Number(body.amountPaise) || 0,
      status: "SUCCEEDED",
      mode: String(body.paymentMode ?? body.mode ?? "CASH"),
      receiptNumber: `RC-DEMO-${String(Date.now()).slice(-6)}`,
      createdAt: nowIso(),
      recordedAt: nowIso(),
    };
    demoRecentPayments.unshift(payment);
    return { payment };
  }

  return undefined;
}
