import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertManualPaymentRecordContext,
  computeSubscriptionWindow,
  MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE,
  markShopOrderPaid,
  validateManualMembershipPaymentAmount,
} from "@zook/core/services";
import { prisma } from "@zook/db";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { ensurePaymentInvoiceDocument } from "../invoices/generate";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  assertOrgUser,
  clean,
  createDirectNotification,
  ensureOrganizationMembership,
  getOrganizationScopedFileAsset,
  pathMatches,
  resolveOrgBranch,
} from "./core";
import { getRequestContext } from "../access";

const manualMembershipPaymentSchema = z
  .object({
    purpose: z.enum(["MEMBERSHIP", "SHOP_ORDER", "OTHER"]).default("MEMBERSHIP"),
    memberUserId: z.string().optional(),
    planId: z.string().optional(),
    subscriptionId: z.string().optional(),
    shopOrderId: z.string().optional(),
    description: z.string().trim().max(500).optional(),
    amountPaise: z.number().int().positive(),
    mode: z.enum(["CASH", "DIRECT_UPI", "BANK_TRANSFER", "CARD", "OTHER"]),
    proofAssetId: z.string().optional(),
    receiptNumber: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.purpose === "MEMBERSHIP" && !value.memberUserId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A member is required." });
    }
    if (value.purpose === "MEMBERSHIP" && !value.planId && !value.subscriptionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A plan or subscription is required.",
      });
    }
    if (value.purpose === "SHOP_ORDER" && !value.shopOrderId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A shop order is required." });
    }
    if (value.purpose === "OTHER" && !value.description) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A description is required." });
    }
  });

async function handleManualPaymentRequest(request: NextRequest, orgId: string, rawBody: unknown) {
  const ctx = await getRequestContext(request, { orgId });
  const userId = assertManualPaymentRecordContext(ctx, orgId);
  await assertRateLimit(
    "manualPaymentByActorOrg",
    `${orgId}:${userId}`,
    "Too many manual payments from this account today.",
  );
  const body = manualMembershipPaymentSchema.parse(rawBody);
  const proofAsset = await getOrganizationScopedFileAsset(body.proofAssetId, orgId, [
    "payment_proof",
  ]);
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw notFoundError("Organization not found");
  }

  if (body.purpose === "SHOP_ORDER") {
    const shopOrderId = body.shopOrderId!;
    const order = await prisma.shopOrder.findFirst({ where: { id: shopOrderId, orgId } });
    if (!order) {
      throw notFoundError("Shop order not found");
    }
    await assertBranchAccessForContext(ctx, orgId, order.branchId);
    if (order.paymentId || order.status !== "PENDING_PAYMENT") {
      throw conflictError("This shop order cannot be paid at the desk.");
    }
    const items = await prisma.shopOrderItem.findMany({ where: { orderId: order.id } });
    if (!items.length) {
      throw validationError("Shop order has no items.");
    }
    const itemTotalPaise = items.reduce(
      (total, item) => total + item.unitPaise * item.quantity,
      0,
    );
    if (itemTotalPaise !== order.totalPaise || body.amountPaise !== order.totalPaise) {
      throw validationError("Payment amount must match the shop order total.");
    }
    const readyOrder = markShopOrderPaid(
      {
        id: order.id,
        status: order.status,
        totalPaise: order.totalPaise,
      },
      `ZK-${order.id.slice(-6).toUpperCase()}`,
    );
    const pickupCode = readyOrder.pickupCode!;
    const { payment, updatedOrder } = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: clean({
          orgId,
          branchId: order.branchId,
          userId: order.userId,
          purpose: "SHOP_ORDER",
          amountPaise: body.amountPaise,
          status: "SUCCEEDED",
          mode: body.mode,
          proofAssetId: proofAsset?.id,
          receiptNumber: body.receiptNumber,
          notes: body.notes,
          recordedById: userId,
          recordedAt: new Date(),
        }),
      });
      const settledOrder = await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          paymentId: createdPayment.id,
          status: readyOrder.status,
          pickupCode,
        },
      });
      const reservation = await tx.inventoryMovement.findFirst({
        where: { orderId: order.id, reason: "shop_order_reserved" },
        select: { id: true },
      });
      if (!reservation) {
        await Promise.all(
          items.map(async (item) => {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
            await tx.inventoryMovement.create({
              data: {
                orgId,
                branchId: order.branchId,
                productId: item.productId,
                delta: -item.quantity,
                reason: "shop_order_paid",
                orderId: order.id,
                createdById: userId,
              },
            });
          }),
        );
      }
      await tx.pickupCode.upsert({
        where: { orderId: order.id },
        update: {
          code: pickupCode,
          status: readyOrder.status,
        },
        create: {
          orgId,
          orderId: order.id,
          code: pickupCode,
          status: readyOrder.status,
        },
      });
      return { payment: createdPayment, updatedOrder: settledOrder };
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Order available for pickup",
      body: `Your desk payment is recorded. Show pickup code ${pickupCode} at the gym.`,
      audience: "selected_member",
      userIds: [order.userId],
      metadata: clean({ paymentId: payment.id, shopOrderId: order.id, pickupCode }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "payment.shop_manual_recorded",
      entityType: "payment",
      entityId: payment.id,
      metadata: { shopOrderId: order.id, amountPaise: payment.amountPaise, mode: payment.mode },
    });
    const orderUser = await prisma.user.findUnique({ where: { id: order.userId } });
    await ensurePaymentInvoiceDocument({ org, payment, user: orderUser });
    return ok({ payment, order: updatedOrder });
  }

  if (body.purpose === "OTHER") {
    const branchId = await assertBranchAccessForContext(ctx, orgId, undefined);
    const payment = await prisma.payment.create({
      data: clean({
        orgId,
        branchId,
        purpose: "OTHER",
        amountPaise: body.amountPaise,
        status: "SUCCEEDED",
        mode: body.mode,
        proofAssetId: proofAsset?.id,
        receiptNumber: body.receiptNumber,
        notes: body.notes,
        recordedById: userId,
        recordedAt: new Date(),
        metadata: { description: body.description },
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "payment.general_manual_recorded",
      entityType: "payment",
      entityId: payment.id,
      metadata: { amountPaise: payment.amountPaise, mode: payment.mode },
    });
    await ensurePaymentInvoiceDocument({ org, payment, user: null });
    return ok({ payment });
  }

  const memberUserId = body.memberUserId!;
  const memberUser = await prisma.user.findUnique({ where: { id: memberUserId } });
  if (!memberUser) {
    throw notFoundError("Member not found");
  }
  await assertOrgUser({ orgId, userId: memberUserId, role: "MEMBER" });
  const deskBranchId = await assertBranchAccessForContext(ctx, orgId, undefined);
  const basePaymentData = clean({
    orgId,
    userId: memberUserId,
    purpose: "MEMBERSHIP",
    amountPaise: body.amountPaise,
    status: "SUCCEEDED",
    mode: body.mode,
    proofAssetId: proofAsset?.id,
    receiptNumber: body.receiptNumber,
    notes: body.notes,
    recordedById: userId,
    recordedAt: new Date(),
  });
  let payment: Awaited<ReturnType<typeof prisma.payment.create>>;
  let subscription = null as Awaited<ReturnType<typeof prisma.memberSubscription.create>> | null;
  if (body.subscriptionId) {
    const existingSubscription = await prisma.memberSubscription.findFirst({
      where: { id: body.subscriptionId, orgId, memberUserId },
    });
    if (!existingSubscription) {
      throw notFoundError("Subscription not found");
    }
    if (
      deskBranchId &&
      existingSubscription.branchId &&
      existingSubscription.branchId !== deskBranchId
    ) {
      throw forbiddenError("This membership belongs to another branch.");
    }
    if (existingSubscription.status === "ACTIVE") {
      throw conflictError("Subscription is already active");
    }
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: existingSubscription.planId, orgId },
    });
    if (!plan) {
      throw notFoundError("Membership plan not found");
    }
    try {
      validateManualMembershipPaymentAmount({
        amountPaise: body.amountPaise,
        expectedAmountPaise: plan.pricePaise,
      });
    } catch {
      throw validationError(
        `Manual membership payments must be within Rs ${(MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE / 100).toFixed(2)} of the plan price.`,
      );
    }
    const window = computeSubscriptionWindow(
      clean({
        id: plan.id,
        orgId: plan.orgId,
        branchId: plan.branchId ?? undefined,
        name: plan.name,
        type: plan.type,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays ?? undefined,
        visitLimit: plan.visitLimit ?? undefined,
        validityDays: plan.validityDays ?? undefined,
        startDate: plan.startDate ?? undefined,
        endDate: plan.endDate ?? undefined,
        active: plan.active,
        publicVisible: plan.publicVisible,
      }),
    );
    payment = await prisma.payment.create({
      data: clean({
        ...basePaymentData,
        branchId: existingSubscription.branchId ?? deskBranchId,
      }),
    });
    subscription = await prisma.memberSubscription.update({
      where: { id: existingSubscription.id },
      data: clean({
        branchId: existingSubscription.branchId ?? deskBranchId,
        status: "ACTIVE",
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        remainingVisits: window.remainingVisits,
        paymentId: payment.id,
        activatedById: userId,
      }),
    });
  } else {
    const planId = body.planId;
    if (!planId) {
      throw validationError("A plan is required for manual membership activation.");
    }
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, orgId, active: true },
    });
    if (!plan) {
      throw notFoundError("Membership plan not found");
    }
    if (deskBranchId && plan.branchId && plan.branchId !== deskBranchId) {
      throw forbiddenError("This plan belongs to another branch.");
    }
    try {
      validateManualMembershipPaymentAmount({
        amountPaise: body.amountPaise,
        expectedAmountPaise: plan.pricePaise,
      });
    } catch {
      throw validationError(
        `Manual membership payments must be within Rs ${(MANUAL_MEMBERSHIP_PAYMENT_TOLERANCE_PAISE / 100).toFixed(2)} of the plan price.`,
      );
    }
    const branch = await resolveOrgBranch(orgId, deskBranchId ?? plan.branchId);
    const window = computeSubscriptionWindow(
      clean({
        id: plan.id,
        orgId: plan.orgId,
        branchId: branch.id,
        name: plan.name,
        type: plan.type,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays ?? undefined,
        visitLimit: plan.visitLimit ?? undefined,
        validityDays: plan.validityDays ?? undefined,
        startDate: plan.startDate ?? undefined,
        endDate: plan.endDate ?? undefined,
        active: plan.active,
        publicVisible: plan.publicVisible,
      }),
    );
    payment = await prisma.payment.create({
      data: clean({ ...basePaymentData, branchId: branch.id }),
    });
    subscription = await prisma.memberSubscription.create({
      data: clean({
        orgId,
        branchId: branch.id,
        memberUserId,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        remainingVisits: window.remainingVisits,
        paymentId: payment.id,
        activatedById: userId,
      }),
    });
  }
  await ensureOrganizationMembership({
    orgId,
    userId: memberUserId,
    profilePhotoUrl: memberUser.profilePhotoUrl,
    marketingOptIn: memberUser.marketingOptIn,
  });
  await createDirectNotification({
    orgId,
    createdById: userId,
    type: "TRANSACTIONAL",
    title: "Membership activated",
    body: "Your membership has been activated with an offline payment record.",
    audience: "selected_member",
    userIds: [memberUserId],
    metadata: clean({ paymentId: payment.id, subscriptionId: subscription?.id }),
  });
  await writeAuditLog({
    request,
    orgId,
    actorUserId: userId,
    action: "payment.manual_recorded",
    entityType: "payment",
    entityId: payment.id,
    metadata: { amountPaise: payment.amountPaise, mode: payment.mode },
  });
  await ensurePaymentInvoiceDocument({ org, payment, user: memberUser });
  return ok({ payment, subscription });
}

export async function handleManualPayments(request: NextRequest, path: string[]) {
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "manual-payment"])
  ) {
    const orgId = path[1]!;
    const shopOrderId = path[4]!;
    const payload = (await readJson(request)) as Record<string, unknown>;
    return handleManualPaymentRequest(request, orgId, {
      ...payload,
      purpose: "SHOP_ORDER",
      shopOrderId,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "manual-payments"])) {
    const orgId = path[1]!;
    return handleManualPaymentRequest(request, orgId, await readJson(request));
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "manual-payments", "general"])
  ) {
    const orgId = path[1]!;
    const payload = (await readJson(request)) as Record<string, unknown>;
    return handleManualPaymentRequest(request, orgId, {
      ...payload,
      purpose: "OTHER",
    });
  }
}
