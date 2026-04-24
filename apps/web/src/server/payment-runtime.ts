import type { MembershipPlan, PaymentMode, PaymentStatus } from "@zook/core";
import {
  calculateShopOrder,
  computeSubscriptionWindow,
  markShopOrderPaid,
  transitionPaymentSession
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { assertMinorConsentGranted } from "./minor-gates";

function clean<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function toMembershipPlanInput(plan: {
  id: string;
  orgId: string;
  branchId: string | null;
  name: string;
  type: "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL";
  pricePaise: number;
  durationDays: number | null;
  visitLimit: number | null;
  validityDays: number | null;
  startDate: Date | null;
  endDate: Date | null;
  active: boolean;
  publicVisible: boolean;
}): MembershipPlan {
  return {
    id: plan.id,
    orgId: plan.orgId,
    ...(plan.branchId ? { branchId: plan.branchId } : {}),
    name: plan.name,
    type: plan.type,
    pricePaise: plan.pricePaise,
    ...(plan.durationDays !== null ? { durationDays: plan.durationDays } : {}),
    ...(plan.visitLimit !== null ? { visitLimit: plan.visitLimit } : {}),
    ...(plan.validityDays !== null ? { validityDays: plan.validityDays } : {}),
    ...(plan.startDate ? { startDate: plan.startDate } : {}),
    ...(plan.endDate ? { endDate: plan.endDate } : {}),
    active: plan.active,
    publicVisible: plan.publicVisible
  };
}

type PaymentSessionMetadata = {
  subscriptionId?: string;
  shopOrderId?: string;
  couponId?: string;
  referralCodeId?: string;
  joinRequestId?: string;
};

export async function applyPaymentSessionStatus(input: {
  sessionId: string;
  nextStatus: PaymentStatus;
  provider: string;
  providerRef?: string;
  paymentMode: PaymentMode;
  expectedAmountPaise?: number;
  createNotification: (input: {
    orgId?: string;
    createdById?: string;
    type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY";
    title: string;
    body: string;
    audience: string;
    metadata?: Prisma.InputJsonValue;
    userIds: string[];
    pushEnabled?: boolean;
  }) => Promise<unknown>;
  ensureMembership: (input: {
    orgId: string;
    userId: string;
    joinedAt?: Date;
    profilePhotoUrl?: string | null;
    marketingOptIn?: boolean;
  }) => Promise<void>;
}) {
  const currentSession = await prisma.paymentSession.findUnique({ where: { id: input.sessionId } });
  if (!currentSession) {
    throw new Error("Payment session not found");
  }

  const nextState = transitionPaymentSession(
    {
      id: currentSession.id,
      purpose: currentSession.purpose,
      amountPaise: currentSession.amountPaise,
      status: currentSession.status
    },
    input.nextStatus,
    input.expectedAmountPaise !== undefined ? { expectedAmountPaise: input.expectedAmountPaise } : {}
  );

  const completedAt =
    nextState.status === "SUCCEEDED" ||
    nextState.status === "FAILED" ||
    nextState.status === "CANCELLED" ||
    nextState.status === "EXPIRED" ||
    nextState.status === "REFUNDED"
      ? new Date()
      : undefined;

  const session = await prisma.paymentSession.update({
    where: { id: input.sessionId },
    data: clean({
      provider: input.provider,
      providerRef: input.providerRef ?? currentSession.providerRef ?? undefined,
      status: nextState.status,
      completedAt
    })
  });

  const metadata = ((session.metadata ?? {}) as PaymentSessionMetadata) ?? {};
  let payment =
    (await prisma.payment.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" }
    })) ?? null;

  if (session.status === "SUCCEEDED") {
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          ...(session.orgId ? { orgId: session.orgId } : {}),
          ...(session.userId ? { userId: session.userId } : {}),
          sessionId: session.id,
          purpose: session.purpose,
          amountPaise: session.amountPaise,
          currency: session.currency,
          status: "SUCCEEDED",
          mode: input.paymentMode,
          provider: input.provider,
          providerRef: input.providerRef ?? session.providerRef ?? session.id,
          recordedAt: new Date()
        }
      });
    } else if (payment.status !== "SUCCEEDED") {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          mode: input.paymentMode,
          provider: input.provider,
          providerRef: input.providerRef ?? session.providerRef ?? payment.providerRef,
          recordedAt: payment.recordedAt ?? new Date()
        }
      });
    }

    if (metadata.subscriptionId) {
      const [planSub, user] = await Promise.all([
        prisma.memberSubscription.findUnique({ where: { id: metadata.subscriptionId } }),
        session.userId ? prisma.user.findUnique({ where: { id: session.userId } }) : Promise.resolve(null)
      ]);
      const plan = planSub ? await prisma.membershipPlan.findUnique({ where: { id: planSub.planId } }) : null;

      if (planSub && plan && session.userId && user && planSub.status !== "ACTIVE") {
        assertMinorConsentGranted({
          isMinor: user.isMinor,
          guardianPending: user.guardianPending,
          action: "membership activation"
        });
        const window = computeSubscriptionWindow(toMembershipPlanInput(plan));
        await prisma.memberSubscription.update({
          where: { id: metadata.subscriptionId },
          data: clean({
            status: "ACTIVE",
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            remainingVisits: window.remainingVisits,
            paymentId: payment.id,
            activatedById: session.userId
          })
        });
        await input.ensureMembership({
          orgId: planSub.orgId,
          userId: session.userId,
          profilePhotoUrl: user.profilePhotoUrl,
          marketingOptIn: user.isMinor ? false : user.marketingOptIn
        });
        if (metadata.couponId) {
          const existingCouponRedemption = await prisma.couponRedemption.findFirst({
            where: { paymentSessionId: session.id, couponId: metadata.couponId, userId: session.userId }
          });
          if (!existingCouponRedemption) {
            await prisma.couponRedemption.create({
              data: {
                orgId: planSub.orgId,
                couponId: metadata.couponId,
                userId: session.userId,
                subscriptionId: planSub.id,
                paymentSessionId: session.id,
                discountPaise: Math.max(plan.pricePaise - session.amountPaise, 0)
              }
            });
          }
        }
        if (metadata.referralCodeId) {
          const existingReferralRedemption = await prisma.referralRedemption.findFirst({
            where: {
              orgId: planSub.orgId,
              referralCodeId: metadata.referralCodeId,
              referredUserId: session.userId
            }
          });
          if (!existingReferralRedemption) {
            await prisma.referralRedemption.create({
              data: {
                orgId: planSub.orgId,
                referralCodeId: metadata.referralCodeId,
                referredUserId: session.userId,
                subscriptionId: planSub.id
              }
            });
            await prisma.referralCode.update({
              where: { id: metadata.referralCodeId },
              data: { redemptionCount: { increment: 1 } }
            });
          }
        }
        await input.createNotification({
          orgId: planSub.orgId,
          createdById: session.userId,
          type: "TRANSACTIONAL",
          title: "Membership activated",
          body: `Your ${plan.name} membership is now active.`,
          audience: "selected_member",
          userIds: [session.userId],
          pushEnabled: true,
          metadata: { subscriptionId: planSub.id, paymentId: payment.id }
        });
      }
    }

    if (metadata.shopOrderId) {
      const existingOrder = await prisma.shopOrder.findUnique({ where: { id: metadata.shopOrderId } });
      if (existingOrder && existingOrder.status === "PENDING_PAYMENT") {
        const items = await prisma.shopOrderItem.findMany({ where: { orderId: existingOrder.id } });
        const orderProducts = await prisma.product.findMany({
          where: { id: { in: items.map((item) => item.productId) } }
        });
        const calculation = calculateShopOrder({
          products: orderProducts.map((product) => ({
            id: product.id,
            stock: product.stock,
            pricePaise: product.pricePaise,
            active: product.active
          })),
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        });
        const readyOrder = markShopOrderPaid(
          { id: existingOrder.id, status: existingOrder.status, totalPaise: existingOrder.totalPaise },
          `ZK-${session.id.slice(-6).toUpperCase()}`
        );

        await prisma.$transaction(async (tx) => {
          await Promise.all(
            calculation.stockDeltas.map(async (delta) => {
              await tx.product.update({
                where: { id: delta.productId },
                data: { stock: { increment: delta.delta } }
              });
              await tx.inventoryMovement.create({
                data: {
                  orgId: existingOrder.orgId,
                  productId: delta.productId,
                  delta: delta.delta,
                  reason: "shop_order_paid",
                  orderId: existingOrder.id,
                  ...(session.userId ? { createdById: session.userId } : {})
                }
              });
            })
          );

          await tx.shopOrder.update({
            where: { id: existingOrder.id },
            data: clean({
              status: readyOrder.status,
              paymentId: payment?.id,
              pickupCode: readyOrder.pickupCode,
              paymentSessionId: session.id
            })
          });
          await tx.pickupCode.upsert({
            where: { orderId: existingOrder.id },
            update: {
              code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`,
              status: readyOrder.status
            },
            create: {
              orgId: existingOrder.orgId,
              orderId: existingOrder.id,
              code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`,
              status: readyOrder.status
            }
          });
        });

        await input.createNotification({
          orgId: existingOrder.orgId,
          ...(session.userId ? { createdById: session.userId } : {}),
          type: "TRANSACTIONAL",
          title: "Order ready for pickup",
          body: `Your pickup code is ${readyOrder.pickupCode}. Show it at reception to collect the order.`,
          audience: "selected_member",
          userIds: [existingOrder.userId],
          pushEnabled: true,
          metadata: {
            orderId: existingOrder.id,
            ...(readyOrder.pickupCode ? { pickupCode: readyOrder.pickupCode } : {})
          } as Prisma.InputJsonValue
        });
      }
    }

    if (session.purpose === "SAAS_BILLING" && session.orgId) {
      await prisma.saaSSubscription.upsert({
        where: { orgId: session.orgId },
        update: {
          status: "ACTIVE",
          paymentSessionId: session.id,
          nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
          orgId: session.orgId,
          status: "ACTIVE",
          trialStartAt: new Date(),
          trialEndAt: new Date(),
          paymentSessionId: session.id,
          nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
      await prisma.organization.update({
        where: { id: session.orgId },
        data: { status: "ACTIVE" }
      });
    }
  } else if (payment && payment.status !== session.status) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: session.status,
        provider: input.provider,
        providerRef: input.providerRef ?? payment.providerRef
      }
    });
  }

  return { session, payment };
}
