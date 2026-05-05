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
  renewalOfSubscriptionId?: string;
  shopOrderId?: string;
  offerId?: string;
  offerDiscountPaise?: number;
  couponId?: string;
  couponDiscountPaise?: number;
  referralCodeId?: string;
  referralDiscountPaise?: number;
  joinRequestId?: string;
};

function assertNotExpiredForSuccess(input: {
  expiresAt: Date;
  status: PaymentStatus;
  nextStatus: PaymentStatus;
}) {
  if (
    input.expiresAt.getTime() < Date.now() &&
    input.nextStatus === "SUCCEEDED" &&
    input.status !== "SUCCEEDED"
  ) {
    throw new Error("Payment session expired");
  }
}

async function assertPaymentSessionTargetIntegrity(input: {
  session: {
    id: string;
    orgId: string | null;
    userId: string | null;
    purpose: string;
    amountPaise: number;
  };
  metadata: PaymentSessionMetadata;
}) {
  if (input.metadata.subscriptionId) {
    if (input.session.purpose !== "MEMBERSHIP") {
      throw new Error("Payment session target mismatch");
    }
    const subscription = await prisma.memberSubscription.findUnique({
      where: { id: input.metadata.subscriptionId }
    });
    if (
      !subscription ||
      subscription.orgId !== input.session.orgId ||
      subscription.memberUserId !== input.session.userId
    ) {
      throw new Error("Payment session target mismatch");
    }
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: subscription.planId, orgId: subscription.orgId }
    });
    if (!plan || input.session.amountPaise > plan.pricePaise) {
      throw new Error("Payment session amount mismatch");
    }
  }

  if (input.metadata.shopOrderId) {
    if (input.session.purpose !== "SHOP_ORDER") {
      throw new Error("Payment session target mismatch");
    }
    const order = await prisma.shopOrder.findUnique({ where: { id: input.metadata.shopOrderId } });
    if (
      !order ||
      order.orgId !== input.session.orgId ||
      order.userId !== input.session.userId ||
      order.totalPaise !== input.session.amountPaise ||
      (order.paymentSessionId && order.paymentSessionId !== input.session.id)
    ) {
      throw new Error("Payment session target mismatch");
    }
  }
}

async function fulfillReferralReward(input: {
  orgId: string;
  referralCodeId: string;
  redemptionId: string;
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
}) {
  const [referralCode, policy, existingReward] = await Promise.all([
    prisma.referralCode.findUnique({ where: { id: input.referralCodeId } }),
    prisma.referralPolicy.upsert({
      where: { orgId: input.orgId },
      update: {},
      create: { orgId: input.orgId }
    }),
    prisma.referralReward.findUnique({ where: { redemptionId: input.redemptionId } })
  ]);
  if (!referralCode || existingReward || policy.referrerRewardType === "NONE" || !policy.enabled) {
    return existingReward;
  }

  const activeSubscription = await prisma.memberSubscription.findFirst({
    where: {
      orgId: input.orgId,
      memberUserId: referralCode.referrerUserId,
      status: "ACTIVE"
    },
    orderBy: { createdAt: "desc" }
  });
  const rewardType = policy.referrerRewardType as "DAYS" | "VISITS";
  let appliedToSubId: string | undefined;
  let appliedAt: Date | undefined;

  if (activeSubscription) {
    if (rewardType === "DAYS") {
      const baseEnd =
        activeSubscription.endsAt && activeSubscription.endsAt.getTime() > Date.now()
          ? activeSubscription.endsAt
          : new Date();
      await prisma.memberSubscription.update({
        where: { id: activeSubscription.id },
        data: {
          endsAt: new Date(baseEnd.getTime() + policy.referrerRewardValue * 24 * 60 * 60 * 1000)
        }
      });
    } else {
      await prisma.memberSubscription.update({
        where: { id: activeSubscription.id },
        data: { remainingVisits: { increment: policy.referrerRewardValue } }
      });
    }
    appliedToSubId = activeSubscription.id;
    appliedAt = new Date();
  }

  const reward = await prisma.referralReward.create({
    data: {
      orgId: input.orgId,
      referralCodeId: input.referralCodeId,
      redemptionId: input.redemptionId,
      referrerUserId: referralCode.referrerUserId,
      rewardType,
      rewardValue: policy.referrerRewardValue,
      ...(appliedToSubId ? { appliedToSubId } : {}),
      status: appliedAt ? "applied" : "pending",
      ...(appliedAt ? { appliedAt } : {}),
      ...(appliedAt ? {} : { expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) })
    }
  });
  await input.createNotification({
    orgId: input.orgId,
    type: "ENGAGEMENT",
    title: appliedAt ? "Referral reward earned" : "Referral reward saved",
    body: appliedAt
      ? `You earned +${policy.referrerRewardValue} ${rewardType.toLowerCase()} from a referral.`
      : `You have a pending referral reward waiting for your next active membership.`,
    audience: "selected_member",
    userIds: [referralCode.referrerUserId],
    pushEnabled: true,
    metadata: { referralRewardId: reward.id, referralCodeId: input.referralCodeId }
  });
  return reward;
}

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

  assertNotExpiredForSuccess({
    expiresAt: currentSession.expiresAt,
    status: currentSession.status,
    nextStatus: input.nextStatus
  });

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

  const metadata = ((currentSession.metadata ?? {}) as PaymentSessionMetadata) ?? {};
  await assertPaymentSessionTargetIntegrity({ session: currentSession, metadata });

  const session = await prisma.paymentSession.update({
    where: { id: input.sessionId },
    data: clean({
      provider: input.provider,
      providerRef: input.providerRef ?? currentSession.providerRef ?? undefined,
      status: nextState.status,
      completedAt
    })
  });

  let payment = await prisma.payment.findUnique({ where: { sessionId: session.id } });

  if (session.status === "SUCCEEDED") {
    payment = await prisma.payment.upsert({
      where: { sessionId: session.id },
      create: {
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
      },
      update: {
        status: "SUCCEEDED",
        mode: input.paymentMode,
        provider: input.provider,
        providerRef: input.providerRef ?? session.providerRef ?? payment?.providerRef ?? null,
        recordedAt: payment?.recordedAt ?? new Date()
      }
    });

    if (metadata.subscriptionId) {
      const [planSub, user] = await Promise.all([
        prisma.memberSubscription.findUnique({ where: { id: metadata.subscriptionId } }),
        session.userId ? prisma.user.findUnique({ where: { id: session.userId } }) : Promise.resolve(null)
      ]);
      const plan = planSub ? await prisma.membershipPlan.findUnique({ where: { id: planSub.planId } }) : null;

      if (
        planSub &&
        plan &&
        session.userId &&
        user &&
        planSub.orgId === session.orgId &&
        planSub.memberUserId === session.userId &&
        planSub.status !== "ACTIVE"
      ) {
        assertMinorConsentGranted({
          isMinor: user.isMinor,
          guardianPending: user.guardianPending,
          action: "membership activation"
        });
        const window = computeSubscriptionWindow(toMembershipPlanInput(plan));
        const renewalSource = metadata.renewalOfSubscriptionId
          ? await prisma.memberSubscription.findFirst({
              where: {
                id: metadata.renewalOfSubscriptionId,
                orgId: planSub.orgId,
                memberUserId: planSub.memberUserId
              }
            })
          : null;
        const renewalStartsAt =
          renewalSource?.endsAt && renewalSource.endsAt.getTime() > Date.now()
            ? renewalSource.endsAt
            : window.startsAt;
        const renewalEndsAt =
          renewalSource && window.endsAt
            ? new Date(renewalStartsAt.getTime() + (window.endsAt.getTime() - window.startsAt.getTime()))
            : window.endsAt;
        await prisma.memberSubscription.update({
          where: { id: metadata.subscriptionId },
          data: clean({
            status: "ACTIVE",
            startsAt: renewalStartsAt,
            endsAt: renewalEndsAt,
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
        if (metadata.offerId) {
          await prisma.offer.update({
            where: { id: metadata.offerId },
            data: { redemptionCount: { increment: 1 } }
          });
        }
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
                discountPaise:
                  metadata.couponDiscountPaise ?? Math.max(plan.pricePaise - session.amountPaise, 0)
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
          let redemption = existingReferralRedemption;
          if (!existingReferralRedemption) {
            redemption = await prisma.referralRedemption.create({
              data: {
                orgId: planSub.orgId,
                referralCodeId: metadata.referralCodeId,
                referredUserId: session.userId,
                subscriptionId: planSub.id,
                metadata: clean({
                  referralDiscountPaise: metadata.referralDiscountPaise
                }) as Prisma.InputJsonValue
              }
            });
            await prisma.referralCode.update({
              where: { id: metadata.referralCodeId },
              data: { redemptionCount: { increment: 1 }, monthlyUseCount: { increment: 1 } }
            });
          }
          if (redemption) {
            await fulfillReferralReward({
              orgId: planSub.orgId,
              referralCodeId: metadata.referralCodeId,
              redemptionId: redemption.id,
              createNotification: input.createNotification
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
      if (
        existingOrder &&
        existingOrder.status === "PENDING_PAYMENT" &&
        existingOrder.orgId === session.orgId &&
        existingOrder.userId === session.userId &&
        existingOrder.totalPaise === session.amountPaise
      ) {
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

        let orderActivated = false;
        await prisma.$transaction(async (tx) => {
          const updated = await tx.shopOrder.updateMany({
            where: { id: existingOrder.id, status: "PENDING_PAYMENT" },
            data: clean({
              status: readyOrder.status,
              paymentId: payment?.id,
              pickupCode: readyOrder.pickupCode,
              paymentSessionId: session.id
            })
          });
          if (updated.count !== 1) {
            return;
          }
          orderActivated = true;

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

        if (orderActivated) {
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

    return { session, payment };
  }

  if (
    session.status === "FAILED" ||
    session.status === "CANCELLED" ||
    session.status === "EXPIRED" ||
    session.status === "REFUNDED"
  ) {
    if (metadata.subscriptionId) {
      await prisma.memberSubscription.updateMany({
        where: { id: metadata.subscriptionId, status: "PENDING_PAYMENT" },
        data: { status: session.status === "REFUNDED" ? "REFUNDED" : "CANCELLED" }
      });
    }
    if (metadata.shopOrderId) {
      await prisma.shopOrder.updateMany({
        where: { id: metadata.shopOrderId, status: "PENDING_PAYMENT" },
        data: { status: session.status === "REFUNDED" ? "REFUNDED" : "CANCELLED" }
      });
    }
  }

  return { session, payment };
}
