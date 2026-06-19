import type { MembershipPlan, PaymentMandateStatus, PaymentMode, PaymentStatus } from "@zook/core";
import type { ParsedPaymentWebhookEvent } from "@zook/core/providers";
import {
  calculateShopOrder,
  createSubscriptionReminder,
  computeSubscriptionWindow,
  markShopOrderPaid,
  shouldCreatePaymentFailureReminder,
  transitionPaymentSession,
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import { ensurePaymentInvoiceDocument, ensureSaasInvoiceDocument } from "./invoices/generate";
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
    publicVisible: plan.publicVisible,
  };
}

type PaymentSessionMetadata = {
  orgId?: string;
  tier?: "STARTER" | "GROWTH" | "PRO";
  billingCycle?: "MONTHLY" | "YEARLY";
  priceLockedPaise?: number;
  subscriptionId?: string;
  renewalOfSubscriptionId?: string;
  autopayMandateId?: string;
  shopOrderId?: string;
  offerId?: string;
  offerDiscountPaise?: number;
  couponId?: string;
  couponDiscountPaise?: number;
  referralCodeId?: string;
  referralDiscountPaise?: number;
  joinRequestId?: string;
};

type DeferredNotificationInput = {
  orgId?: string;
  createdById?: string;
  type: "TRANSACTIONAL" | "OPERATIONAL" | "PROMOTIONAL" | "ENGAGEMENT" | "PLAN" | "SECURITY";
  title: string;
  body: string;
  audience: string;
  metadata?: Prisma.InputJsonValue;
  userIds: string[];
  pushEnabled?: boolean;
};

type MembershipEnsureInput = {
  orgId: string;
  userId: string;
  joinedAt?: Date;
  profilePhotoUrl?: string | null;
  marketingOptIn?: boolean;
};

type MembershipOpsClient = Pick<
  typeof prisma,
  "memberSubscription" | "referralReward" | "referralCode" | "referralPolicy"
>;

type ReferralRewardClient = Pick<
  MembershipOpsClient,
  "memberSubscription" | "referralReward"
>;

type ReferralFulfillmentClient = Pick<
  MembershipOpsClient,
  "memberSubscription" | "referralReward" | "referralCode" | "referralPolicy"
>;

async function applyReferralRewardToSubscription(input: {
  client: ReferralRewardClient;
  rewardType: "DAYS" | "VISITS";
  rewardValue: number;
  subscription: {
    id: string;
    endsAt: Date | null;
    remainingVisits: number | null;
  };
}) {
  if (input.rewardType === "DAYS") {
    const baseEnd =
      input.subscription.endsAt && input.subscription.endsAt.getTime() > Date.now()
        ? input.subscription.endsAt
        : new Date();
    return input.client.memberSubscription.update({
      where: { id: input.subscription.id },
      data: {
        endsAt: new Date(baseEnd.getTime() + input.rewardValue * 24 * 60 * 60 * 1000),
      },
    });
  }

  return input.client.memberSubscription.update({
    where: { id: input.subscription.id },
    data: { remainingVisits: (input.subscription.remainingVisits ?? 0) + input.rewardValue },
  });
}

async function applyPendingReferralRewardsForSubscription(input: {
  client: MembershipOpsClient;
  orgId: string;
  referrerUserId: string;
  subscription: {
    id: string;
    endsAt: Date | null;
    remainingVisits: number | null;
  };
}) {
  const rewards = await input.client.referralReward.findMany({
    where: {
      orgId: input.orgId,
      referrerUserId: input.referrerUserId,
      status: "pending",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
  });

  let subscription = input.subscription;
  for (const reward of rewards) {
    subscription = await applyReferralRewardToSubscription({
      client: input.client,
      rewardType: reward.rewardType as "DAYS" | "VISITS",
      rewardValue: reward.rewardValue,
      subscription,
    });
    await input.client.referralReward.update({
      where: { id: reward.id },
      data: {
        appliedToSubId: input.subscription.id,
        status: "applied",
        appliedAt: new Date(),
      },
    });
  }
}

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
    branchId?: string | null;
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
      where: { id: input.metadata.subscriptionId },
    });
    if (
      !subscription ||
      subscription.orgId !== input.session.orgId ||
      subscription.memberUserId !== input.session.userId ||
      Boolean(input.session.branchId && subscription.branchId !== input.session.branchId)
    ) {
      throw new Error("Payment session target mismatch");
    }
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: subscription.planId, orgId: subscription.orgId },
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
      Boolean(input.session.branchId && order.branchId !== input.session.branchId) ||
      order.totalPaise !== input.session.amountPaise ||
      (order.paymentSessionId && order.paymentSessionId !== input.session.id)
    ) {
      throw new Error("Payment session target mismatch");
    }
  }
}

async function fulfillReferralReward(input: {
  client: ReferralFulfillmentClient;
  orgId: string;
  referralCodeId: string;
  redemptionId: string;
}) {
  const [referralCode, policy, existingReward] = await Promise.all([
    input.client.referralCode.findUnique({ where: { id: input.referralCodeId } }),
    input.client.referralPolicy.upsert({
      where: { orgId: input.orgId },
      update: {},
      create: { orgId: input.orgId },
    }),
    input.client.referralReward.findUnique({ where: { redemptionId: input.redemptionId } }),
  ]);
  if (!referralCode || existingReward || policy.referrerRewardType === "NONE" || !policy.enabled) {
    return {
      reward: existingReward,
      notification: null as DeferredNotificationInput | null,
    };
  }

  const activeSubscription = await input.client.memberSubscription.findFirst({
    where: {
      orgId: input.orgId,
      memberUserId: referralCode.referrerUserId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
  });
  const rewardType = policy.referrerRewardType as "DAYS" | "VISITS";
  let appliedToSubId: string | undefined;
  let appliedAt: Date | undefined;

  if (activeSubscription) {
    await applyReferralRewardToSubscription({
      client: input.client,
      rewardType,
      rewardValue: policy.referrerRewardValue,
      subscription: activeSubscription,
    });
    appliedToSubId = activeSubscription.id;
    appliedAt = new Date();
  }

  const reward = await input.client.referralReward.create({
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
      ...(appliedAt ? {} : { expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) }),
    },
  });
  return {
    reward,
    notification: {
      orgId: input.orgId,
      type: "ENGAGEMENT",
      title: appliedAt ? "Referral reward earned" : "Referral reward saved",
      body: appliedAt
        ? `You earned +${policy.referrerRewardValue} ${rewardType.toLowerCase()} from a referral.`
        : "You have a pending referral reward waiting for your next active membership.",
      audience: "selected_member",
      userIds: [referralCode.referrerUserId],
      pushEnabled: true,
      metadata: { referralRewardId: reward.id, referralCodeId: input.referralCodeId },
    } satisfies DeferredNotificationInput,
  };
}

export async function applyPaymentSessionStatus(input: {
  sessionId: string;
  nextStatus: PaymentStatus;
  provider: string;
  providerRef?: string;
  paymentMode: PaymentMode;
  expectedAmountPaise?: number;
  createNotification: (input: DeferredNotificationInput) => Promise<unknown>;
  ensureMembership: (
    input: MembershipEnsureInput,
    tx?: Prisma.TransactionClient,
  ) => Promise<void>;
}) {
  async function findPaymentBySessionOrProviderRef(
    client: Pick<typeof prisma, "payment">,
    inputRef: { sessionId: string; provider: string; providerRef?: string },
  ) {
    const existingBySession = await client.payment.findUnique({ where: { sessionId: inputRef.sessionId } });
    if (existingBySession) {
      return existingBySession;
    }
    if (!inputRef.providerRef) {
      return null;
    }
    return client.payment.findFirst({
      where: { provider: inputRef.provider, providerRef: inputRef.providerRef },
      orderBy: { createdAt: "asc" },
    });
  }

  const currentSession = await prisma.paymentSession.findUnique({ where: { id: input.sessionId } });
  if (!currentSession) {
    throw new Error("Payment session not found");
  }

  assertNotExpiredForSuccess({
    expiresAt: currentSession.expiresAt,
    status: currentSession.status,
    nextStatus: input.nextStatus,
  });

  const nextState = transitionPaymentSession(
    {
      id: currentSession.id,
      purpose: currentSession.purpose,
      amountPaise: currentSession.amountPaise,
      status: currentSession.status,
    },
    input.nextStatus,
    input.expectedAmountPaise !== undefined
      ? { expectedAmountPaise: input.expectedAmountPaise }
      : {},
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

  if (nextState.status === "SUCCEEDED" && metadata.subscriptionId) {
    const subscriptionId = metadata.subscriptionId;
    const membershipFulfillment = await prisma.$transaction(
      async (tx) => {
        const notifications: DeferredNotificationInput[] = [];
        const session = await tx.paymentSession.update({
          where: { id: input.sessionId },
          data: clean({
            provider: input.provider,
            providerRef: input.providerRef ?? currentSession.providerRef ?? undefined,
            status: nextState.status,
            completedAt,
          }),
        });
        const resolvedProviderRef = input.providerRef ?? session.providerRef ?? session.id;
        let payment = await findPaymentBySessionOrProviderRef(tx, {
          sessionId: session.id,
          provider: input.provider,
          providerRef: resolvedProviderRef,
        });

        payment = payment
          ? await tx.payment.update({
              where: { id: payment.id },
              data: {
                ...(payment.sessionId ? {} : { sessionId: session.id }),
                ...(payment.branchId || session.branchId
                  ? { branchId: payment.branchId ?? session.branchId }
                  : {}),
                status: "SUCCEEDED",
                mode: input.paymentMode,
                provider: input.provider,
                providerRef: resolvedProviderRef,
                recordedAt: payment.recordedAt ?? new Date(),
              },
            })
          : await tx.payment.create({
              data: {
                ...(session.orgId ? { orgId: session.orgId } : {}),
                ...(session.branchId ? { branchId: session.branchId } : {}),
                ...(session.userId ? { userId: session.userId } : {}),
                sessionId: session.id,
                purpose: session.purpose,
                amountPaise: session.amountPaise,
                currency: session.currency,
                status: "SUCCEEDED",
                mode: input.paymentMode,
                provider: input.provider,
                providerRef: resolvedProviderRef,
                recordedAt: new Date(),
              },
            }).catch(async (error) => {
              if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
                throw error;
              }
              const replayed = await findPaymentBySessionOrProviderRef(tx, {
                sessionId: session.id,
                provider: input.provider,
                providerRef: resolvedProviderRef,
              });
              if (!replayed) {
                throw error;
              }
              return replayed;
            });

        if (!payment.orgId && session.orgId) {
          payment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              orgId: session.orgId,
              ...(session.branchId ? { branchId: session.branchId } : {}),
              userId: session.userId,
              purpose: session.purpose,
              amountPaise: session.amountPaise,
              currency: session.currency,
            },
          });
        }

        const [planSub, user] = await Promise.all([
          tx.memberSubscription.findUnique({ where: { id: subscriptionId } }),
          session.userId ? tx.user.findUnique({ where: { id: session.userId } }) : Promise.resolve(null),
        ]);
        const plan = planSub
          ? await tx.membershipPlan.findUnique({ where: { id: planSub.planId } })
          : null;

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
            action: "membership activation",
          });
          let reservedReferralRedemption = false;
          if (metadata.referralCodeId) {
            const [policy, referralCode, existingReferralRedemption] = await Promise.all([
              tx.referralPolicy.upsert({
                where: { orgId: planSub.orgId },
                update: {},
                create: { orgId: planSub.orgId },
              }),
              tx.referralCode.findUnique({ where: { id: metadata.referralCodeId } }),
              tx.referralRedemption.findFirst({
                where: {
                  orgId: planSub.orgId,
                  referralCodeId: metadata.referralCodeId,
                  referredUserId: session.userId,
                },
              }),
            ]);
            if (!existingReferralRedemption) {
              const reservation = await tx.referralCode.updateMany({
                where: {
                  id: metadata.referralCodeId,
                  orgId: planSub.orgId,
                  status: "active",
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                  monthlyUseCount: { lt: policy.maxReferralsPerMonth },
                  AND: [
                    {
                      OR: [
                        { maxUses: null },
                        { redemptionCount: { lt: referralCode?.maxUses ?? 0 } },
                      ],
                    },
                  ],
                },
                data: { redemptionCount: { increment: 1 }, monthlyUseCount: { increment: 1 } },
              });
              if (reservation.count !== 1) {
                throw new Error("Referral code has reached its limit");
              }
              reservedReferralRedemption = true;
            }
          }

          const window = computeSubscriptionWindow(toMembershipPlanInput(plan));
          const renewalSource = metadata.renewalOfSubscriptionId
            ? await tx.memberSubscription.findFirst({
                where: {
                  id: metadata.renewalOfSubscriptionId,
                  orgId: planSub.orgId,
                  memberUserId: planSub.memberUserId,
                },
              })
            : null;
          const renewalStartsAt =
            renewalSource?.endsAt && renewalSource.endsAt.getTime() > Date.now()
              ? renewalSource.endsAt
              : window.startsAt;
          const renewalEndsAt =
            renewalSource && window.endsAt
              ? new Date(
                  renewalStartsAt.getTime() + (window.endsAt.getTime() - window.startsAt.getTime()),
                )
              : window.endsAt;
          const activated = await tx.memberSubscription.updateMany({
            where: {
              id: subscriptionId,
              status: { not: "ACTIVE" },
            },
            data: clean({
              status: "ACTIVE",
              startsAt: renewalStartsAt,
              endsAt: renewalEndsAt,
              remainingVisits: window.remainingVisits,
              paymentId: payment.id,
              activatedById: session.userId,
            }),
          });
          if (activated.count === 1) {
            await input.ensureMembership(
              {
                orgId: planSub.orgId,
                userId: session.userId,
                profilePhotoUrl: user.profilePhotoUrl,
                marketingOptIn: user.marketingOptIn,
              },
              tx,
            );
            const activatedSubscription = await tx.memberSubscription.findUnique({
              where: { id: subscriptionId },
            });
            if (activatedSubscription) {
              await applyPendingReferralRewardsForSubscription({
                client: tx,
                orgId: planSub.orgId,
                referrerUserId: session.userId,
                subscription: activatedSubscription,
              });
            }
            if (metadata.offerId) {
              await tx.offer.update({
                where: { id: metadata.offerId },
                data: { redemptionCount: { increment: 1 } },
              });
            }
            if (metadata.couponId) {
              const existingCouponRedemption = await tx.couponRedemption.findUnique({
                where: {
                  paymentSessionId_couponId_userId: {
                    paymentSessionId: session.id,
                    couponId: metadata.couponId,
                    userId: session.userId,
                  },
                },
              });
              if (!existingCouponRedemption) {
                const coupon = await tx.coupon.findFirst({
                  where: { id: metadata.couponId, orgId: planSub.orgId },
                });
                if (!coupon) {
                  throw new Error("Coupon not found");
                }
                if (coupon.perUserLimit !== null) {
                  const userRedemptions = await tx.couponRedemption.count({
                    where: { orgId: planSub.orgId, couponId: coupon.id, userId: session.userId },
                  });
                  if (userRedemptions >= coupon.perUserLimit) {
                    throw new Error("Coupon per-user limit reached");
                  }
                }
                const reservation = await tx.coupon.updateMany({
                  where: {
                    id: coupon.id,
                    orgId: planSub.orgId,
                    active: true,
                    OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
                    AND: [
                      { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
                      {
                        OR: [
                          { maxRedemptions: null },
                          { redemptionCount: { lt: coupon.maxRedemptions ?? 0 } },
                        ],
                      },
                    ],
                  },
                  data: { redemptionCount: { increment: 1 } },
                });
                if (reservation.count !== 1) {
                  throw new Error("Coupon has reached its redemption limit");
                }
                await tx.couponRedemption.create({
                  data: {
                    orgId: planSub.orgId,
                    couponId: metadata.couponId,
                    userId: session.userId,
                    subscriptionId: planSub.id,
                    paymentSessionId: session.id,
                    discountPaise:
                      metadata.couponDiscountPaise ??
                      Math.max(plan.pricePaise - session.amountPaise, 0),
                  },
                });
              }
            }
            if (metadata.referralCodeId) {
              const existingReferralRedemption = await tx.referralRedemption.findFirst({
                where: {
                  orgId: planSub.orgId,
                  referralCodeId: metadata.referralCodeId,
                  referredUserId: session.userId,
                },
              });
              let redemption = existingReferralRedemption;
              if (!existingReferralRedemption) {
                redemption = await tx.referralRedemption.create({
                  data: {
                    orgId: planSub.orgId,
                    referralCodeId: metadata.referralCodeId,
                    referredUserId: session.userId,
                    subscriptionId: planSub.id,
                    metadata: clean({
                      referralDiscountPaise: metadata.referralDiscountPaise,
                    }) as Prisma.InputJsonValue,
                  },
                });
                if (!reservedReferralRedemption) {
                  await tx.referralCode.update({
                    where: { id: metadata.referralCodeId },
                    data: { redemptionCount: { increment: 1 }, monthlyUseCount: { increment: 1 } },
                  });
                }
              } else if (!existingReferralRedemption.subscriptionId) {
                redemption = await tx.referralRedemption.update({
                  where: { id: existingReferralRedemption.id },
                  data: {
                    subscriptionId: planSub.id,
                    metadata: clean({
                      ...(((existingReferralRedemption.metadata ?? {}) as Record<string, unknown>) ?? {}),
                      referralDiscountPaise: metadata.referralDiscountPaise,
                      completedByPaymentSessionId: session.id,
                    }) as Prisma.InputJsonValue,
                  },
                });
              }
              if (redemption) {
                const referralReward = await fulfillReferralReward({
                  client: tx,
                  orgId: planSub.orgId,
                  referralCodeId: metadata.referralCodeId,
                  redemptionId: redemption.id,
                });
                if (referralReward.notification) {
                  notifications.push(referralReward.notification);
                }
              }
            }
            notifications.push({
              orgId: planSub.orgId,
              createdById: session.userId,
              type: "TRANSACTIONAL",
              title: "Membership activated",
              body: `Your ${plan.name} membership is now active.`,
              audience: "selected_member",
              userIds: [session.userId],
              pushEnabled: true,
              metadata: { subscriptionId: planSub.id, paymentId: payment.id },
            });
          }
        }

        return { session, payment, notifications };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    for (const notification of membershipFulfillment.notifications) {
      await input.createNotification(notification);
    }

    if (membershipFulfillment.payment.orgId) {
      const [org, user] = await Promise.all([
        prisma.organization.findUnique({ where: { id: membershipFulfillment.payment.orgId } }),
        membershipFulfillment.payment.userId
          ? prisma.user.findUnique({ where: { id: membershipFulfillment.payment.userId } })
          : null,
      ]);
      if (org) {
        await ensurePaymentInvoiceDocument({ org, payment: membershipFulfillment.payment, user });
      }
    }

    return membershipFulfillment;
  }

  const session = await prisma.paymentSession.update({
    where: { id: input.sessionId },
    data: clean({
      provider: input.provider,
      providerRef: input.providerRef ?? currentSession.providerRef ?? undefined,
      status: nextState.status,
      completedAt,
    }),
  });

  const resolvedProviderRef = input.providerRef ?? session.providerRef ?? session.id;
  let payment = await findPaymentBySessionOrProviderRef(prisma, {
    sessionId: session.id,
    provider: input.provider,
    providerRef: resolvedProviderRef,
  });

  if (session.status === "SUCCEEDED") {
    payment = payment
      ? await prisma.payment.update({
          where: { id: payment.id },
          data: {
            ...(payment.sessionId ? {} : { sessionId: session.id }),
            ...(payment.branchId || session.branchId
              ? { branchId: payment.branchId ?? session.branchId }
              : {}),
            status: "SUCCEEDED",
            mode: input.paymentMode,
            provider: input.provider,
            providerRef: resolvedProviderRef,
            recordedAt: payment.recordedAt ?? new Date(),
          },
        })
      : await prisma.payment.create({
          data: {
            ...(session.orgId ? { orgId: session.orgId } : {}),
            ...(session.branchId ? { branchId: session.branchId } : {}),
            ...(session.userId ? { userId: session.userId } : {}),
            sessionId: session.id,
            purpose: session.purpose,
            amountPaise: session.amountPaise,
            currency: session.currency,
            status: "SUCCEEDED",
            mode: input.paymentMode,
            provider: input.provider,
            providerRef: resolvedProviderRef,
            recordedAt: new Date(),
          },
        }).catch(async (error) => {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
            throw error;
          }
          const replayed = await findPaymentBySessionOrProviderRef(prisma, {
            sessionId: session.id,
            provider: input.provider,
            providerRef: resolvedProviderRef,
          });
          if (!replayed) {
            throw error;
          }
          return replayed;
        });

    if (!payment.orgId && session.orgId) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          orgId: session.orgId,
          ...(session.branchId ? { branchId: session.branchId } : {}),
          userId: session.userId,
          purpose: session.purpose,
          amountPaise: session.amountPaise,
          currency: session.currency,
        },
      });
    }

    if (metadata.shopOrderId) {
      const existingOrder = await prisma.shopOrder.findUnique({
        where: { id: metadata.shopOrderId },
      });
      if (
        existingOrder &&
        existingOrder.status === "PENDING_PAYMENT" &&
        existingOrder.orgId === session.orgId &&
        existingOrder.userId === session.userId &&
        existingOrder.totalPaise === session.amountPaise
      ) {
        const items = await prisma.shopOrderItem.findMany({ where: { orderId: existingOrder.id } });
        const orderProducts = await prisma.product.findMany({
          where: { id: { in: items.map((item) => item.productId) } },
        });
        const calculation = calculateShopOrder({
          products: orderProducts.map((product) => ({
            id: product.id,
            stock: product.stock,
            pricePaise: product.pricePaise,
            active: product.active,
          })),
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        });
        const readyOrder = markShopOrderPaid(
          {
            id: existingOrder.id,
            status: existingOrder.status,
            totalPaise: existingOrder.totalPaise,
          },
          `ZK-${session.id.slice(-6).toUpperCase()}`,
        );

        let orderActivated = false;
        await prisma.$transaction(async (tx) => {
          const updated = await tx.shopOrder.updateMany({
            where: { id: existingOrder.id, status: "PENDING_PAYMENT" },
            data: clean({
              status: readyOrder.status,
              paymentId: payment?.id,
              pickupCode: readyOrder.pickupCode,
              paymentSessionId: session.id,
            }),
          });
          if (updated.count !== 1) {
            return;
          }
          orderActivated = true;

          await Promise.all(
            calculation.stockDeltas.map(async (delta) => {
              await tx.product.update({
                where: { id: delta.productId },
                data: { stock: { increment: delta.delta } },
              });
              await tx.inventoryMovement.create({
                data: {
                  orgId: existingOrder.orgId,
                  branchId: existingOrder.branchId,
                  productId: delta.productId,
                  delta: delta.delta,
                  reason: "shop_order_paid",
                  orderId: existingOrder.id,
                  ...(session.userId ? { createdById: session.userId } : {}),
                },
              });
            }),
          );

          await tx.pickupCode.upsert({
            where: { orderId: existingOrder.id },
            update: {
              code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`,
              status: readyOrder.status,
            },
            create: {
              orgId: existingOrder.orgId,
              orderId: existingOrder.id,
              code: readyOrder.pickupCode ?? `ZK-${session.id.slice(-6).toUpperCase()}`,
              status: readyOrder.status,
            },
          });
        });

        if (orderActivated) {
          await input.createNotification({
            orgId: existingOrder.orgId,
            ...(session.userId ? { createdById: session.userId } : {}),
            type: "TRANSACTIONAL",
            title: "Order available for pickup",
            body: `Your pickup code is ${readyOrder.pickupCode}. Show it at reception to collect the order.`,
            audience: "selected_member",
            userIds: [existingOrder.userId],
            pushEnabled: true,
            metadata: {
              orderId: existingOrder.id,
              ...(readyOrder.pickupCode ? { pickupCode: readyOrder.pickupCode } : {}),
            } as Prisma.InputJsonValue,
          });
        }
      }
    }

    if (session.purpose === "SAAS_BILLING" && session.orgId) {
      const billingCycle = metadata.billingCycle ?? "MONTHLY";
      const nextRenewalAt = new Date();
      if (billingCycle === "YEARLY") {
        nextRenewalAt.setFullYear(nextRenewalAt.getFullYear() + 1);
      } else {
        nextRenewalAt.setMonth(nextRenewalAt.getMonth() + 1);
      }
      const saasSubscription = await prisma.saaSSubscription.upsert({
        where: { orgId: session.orgId },
        update: {
          status: "ACTIVE",
          ...(metadata.tier ? { tier: metadata.tier } : {}),
          billingCycle,
          priceLockedPaise: metadata.priceLockedPaise ?? session.amountPaise,
          paymentSessionId: session.id,
          nextBillingAt: nextRenewalAt,
          nextRenewalAt,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
        create: {
          orgId: session.orgId,
          status: "ACTIVE",
          tier: metadata.tier ?? "STARTER",
          billingCycle,
          trialStartAt: new Date(),
          trialEndAt: new Date(),
          paymentSessionId: session.id,
          nextBillingAt: nextRenewalAt,
          nextRenewalAt,
          priceLockedPaise: metadata.priceLockedPaise ?? session.amountPaise,
        },
      });
      await prisma.organization.update({
        where: { id: session.orgId },
        data: { status: "ACTIVE" },
      });
      await ensureSaasInvoiceDocument({
        orgId: session.orgId,
        paymentId: payment.id,
        subscriptionId: saasSubscription.id,
        amountPaise: session.amountPaise,
        ...(metadata.tier ? { tier: metadata.tier } : {}),
        billingCycle,
      });
    } else if (payment.orgId) {
      const [org, user] = await Promise.all([
        prisma.organization.findUnique({ where: { id: payment.orgId } }),
        payment.userId ? prisma.user.findUnique({ where: { id: payment.userId } }) : null,
      ]);
      if (org) {
        await ensurePaymentInvoiceDocument({ org, payment, user });
      }
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
        data: { status: session.status === "REFUNDED" ? "REFUNDED" : "CANCELLED" },
      });
    }
    if (metadata.shopOrderId) {
      await prisma.shopOrder.updateMany({
        where: { id: metadata.shopOrderId, status: "PENDING_PAYMENT" },
        data: { status: session.status === "REFUNDED" ? "REFUNDED" : "CANCELLED" },
      });
    }
  }

  return { session, payment };
}

function rawWebhookEntity(rawPayload: unknown, entityName: "subscription" | "payment" | "invoice") {
  if (!rawPayload || Array.isArray(rawPayload) || typeof rawPayload !== "object") {
    return {};
  }
  const payload = (rawPayload as { payload?: unknown }).payload;
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return {};
  }
  const wrapper = (payload as Record<string, unknown>)[entityName];
  if (!wrapper || Array.isArray(wrapper) || typeof wrapper !== "object") {
    return {};
  }
  const entity = (wrapper as { entity?: unknown }).entity;
  return entity && !Array.isArray(entity) && typeof entity === "object"
    ? (entity as Record<string, unknown>)
    : {};
}

function dateFromUnixSeconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1000)
    : undefined;
}

function mandateStatusFromRazorpay(eventType: string, providerStatus?: string): PaymentMandateStatus {
  if (eventType === "subscription.authenticated") return "AUTHENTICATED";
  if (eventType === "subscription.activated" || eventType === "subscription.charged" || eventType === "invoice.paid") {
    return "ACTIVE";
  }
  if (eventType === "subscription.paused") return "PAUSED";
  if (eventType === "subscription.halted") return "HALTED";
  if (eventType === "subscription.cancelled") return "CANCELLED";
  if (eventType === "subscription.completed") return "COMPLETED";
  if (eventType === "subscription.expired") return "EXPIRED";
  if (eventType === "payment.failed" || eventType === "invoice.payment_failed") return "FAILED";

  switch (providerStatus) {
    case "authenticated":
      return "AUTHENTICATED";
    case "active":
      return "ACTIVE";
    case "pending":
      return "PENDING";
    case "halted":
      return "HALTED";
    case "paused":
      return "PAUSED";
    case "cancelled":
      return "CANCELLED";
    case "completed":
      return "COMPLETED";
    case "expired":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

function isAutopayProviderEvent(event: ParsedPaymentWebhookEvent) {
  return (
    Boolean(event.providerSubscriptionId) &&
    (event.eventType.startsWith("subscription.") || event.eventType.startsWith("invoice."))
  );
}

export async function applyAutopayProviderEvent(input: {
  event: ParsedPaymentWebhookEvent;
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
  }, tx?: Prisma.TransactionClient) => Promise<void>;
}) {
  if (!isAutopayProviderEvent(input.event)) {
    return null;
  }

  const metadata = input.event.metadata ?? {};
  const metadataMandateId =
    typeof metadata.autopayMandateId === "string" ? metadata.autopayMandateId : undefined;
  const providerSubscriptionId = input.event.providerSubscriptionId;
  const mandate =
    (metadataMandateId
      ? await prisma.paymentMandate.findUnique({ where: { id: metadataMandateId } })
      : null) ??
    (providerSubscriptionId
      ? await prisma.paymentMandate.findFirst({
          where: { provider: input.event.provider, providerMandateId: providerSubscriptionId },
        })
      : null);

  if (!mandate) {
    throw new Error("Autopay mandate not found for provider subscription event.");
  }

  const subscriptionEntity = rawWebhookEntity(input.event.rawPayload, "subscription");
  const providerStatus =
    typeof subscriptionEntity.status === "string" ? subscriptionEntity.status : undefined;
  const nextStatus = mandateStatusFromRazorpay(input.event.eventType, providerStatus);
  const currentStartAt = dateFromUnixSeconds(subscriptionEntity.current_start);
  const currentEndAt = dateFromUnixSeconds(subscriptionEntity.current_end);
  const nextChargeAt = dateFromUnixSeconds(subscriptionEntity.charge_at);
  const paidCount =
    typeof subscriptionEntity.paid_count === "number" ? subscriptionEntity.paid_count : undefined;
  const totalCount =
    typeof subscriptionEntity.total_count === "number" ? subscriptionEntity.total_count : undefined;

  const updatedMandate = await prisma.paymentMandate.update({
    where: { id: mandate.id },
    data: clean({
      status: nextStatus,
      providerMandateId: providerSubscriptionId ?? mandate.providerMandateId ?? undefined,
      providerPlanId:
        typeof subscriptionEntity.plan_id === "string"
          ? subscriptionEntity.plan_id
          : mandate.providerPlanId ?? undefined,
      currentStartAt,
      currentEndAt,
      nextChargeAt,
      paidCount,
      totalCount,
      authenticatedAt:
        nextStatus === "AUTHENTICATED" && !mandate.authenticatedAt ? new Date() : undefined,
      activatedAt: nextStatus === "ACTIVE" && !mandate.activatedAt ? new Date() : undefined,
      cancelledAt: nextStatus === "CANCELLED" && !mandate.cancelledAt ? new Date() : undefined,
      metadata: {
        ...(((mandate.metadata ?? {}) as Record<string, unknown>) ?? {}),
        lastProviderEventId: input.event.providerEventId,
        lastProviderEventType: input.event.eventType,
      } as Prisma.InputJsonValue,
    }),
  });

  if (shouldCreatePaymentFailureReminder({ eventType: input.event.eventType, mandateStatus: nextStatus })) {
    const reminderState = createSubscriptionReminder({
      orgId: mandate.orgId,
      userId: mandate.userId,
      subscriptionId: mandate.latestSubscriptionId ?? mandate.sourceSubscriptionId,
      mandateId: mandate.id,
      kind: "PAYMENT_FAILED",
      dueInMs: 0,
    });
    const existingReminder = await prisma.subscriptionReminder.findFirst({
      where: {
        orgId: mandate.orgId,
        userId: mandate.userId,
        mandateId: mandate.id,
        kind: "PAYMENT_FAILED",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
    const reminder = existingReminder
      ? await prisma.subscriptionReminder.update({
          where: { id: existingReminder.id },
          data: {
            dueAt: reminderState.dueAt,
            attemptCount: { increment: 1 },
            metadata: {
              ...(((existingReminder.metadata ?? {}) as Record<string, unknown>) ?? {}),
              lastProviderEventId: input.event.providerEventId,
              lastProviderEventType: input.event.eventType,
            } as Prisma.InputJsonValue,
          },
        })
      : await prisma.subscriptionReminder.create({
          data: {
            orgId: reminderState.orgId,
            userId: reminderState.userId,
            ...(reminderState.subscriptionId ? { subscriptionId: reminderState.subscriptionId } : {}),
            ...(reminderState.mandateId ? { mandateId: reminderState.mandateId } : {}),
            kind: reminderState.kind,
            status: reminderState.status,
            dueAt: reminderState.dueAt,
            attemptCount: reminderState.attemptCount ?? 0,
            metadata: {
              provider: input.event.provider,
              providerEventId: input.event.providerEventId,
              providerEventType: input.event.eventType,
            } as Prisma.InputJsonValue,
          },
        });
    if (!existingReminder) {
      await input.createNotification({
        orgId: mandate.orgId,
        createdById: mandate.userId,
        type: "TRANSACTIONAL",
        title: "Autopay needs attention",
        body: "We could not complete your membership autopay. Please update your payment method or contact the gym.",
        audience: "selected_member",
        userIds: [mandate.userId],
        pushEnabled: true,
        metadata: { autopayMandateId: mandate.id, reminderId: reminder.id },
      });
    }
    return { mandate: updatedMandate, payment: null, subscription: null, reminder };
  }

  if (input.event.eventType !== "subscription.charged" && input.event.eventType !== "invoice.paid") {
    return { mandate: updatedMandate, payment: null, subscription: null };
  }

  if (!input.event.providerPaymentId) {
    throw new Error("Autopay charge event did not include a provider payment id.");
  }

  const [plan, user, sourceSubscription] = await Promise.all([
    prisma.membershipPlan.findFirst({ where: { id: mandate.planId, orgId: mandate.orgId } }),
    prisma.user.findUnique({ where: { id: mandate.userId } }),
    prisma.memberSubscription.findFirst({
      where: {
        id: mandate.latestSubscriptionId ?? mandate.sourceSubscriptionId,
        orgId: mandate.orgId,
        memberUserId: mandate.userId,
      },
    }),
  ]);

  if (!plan || !user || !sourceSubscription) {
    throw new Error("Autopay membership target could not be resolved.");
  }

  assertMinorConsentGranted({
    isMinor: user.isMinor,
    guardianPending: user.guardianPending,
    action: "membership autopay renewal",
  });

  let payment = await prisma.payment.findFirst({
    where: { provider: input.event.provider, providerRef: input.event.providerPaymentId },
    orderBy: { createdAt: "asc" },
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orgId: mandate.orgId,
        branchId: sourceSubscription.branchId,
        userId: mandate.userId,
        purpose: "MEMBERSHIP",
        amountPaise: input.event.amountPaise ?? mandate.amountPaise,
        currency: input.event.currency ?? mandate.currency,
        status: "SUCCEEDED",
        mode: "CARD",
        provider: input.event.provider,
        providerRef: input.event.providerPaymentId,
        recordedAt: new Date(),
        metadata: clean({
          autopayMandateId: mandate.id,
          providerSubscriptionId,
          providerEventId: input.event.providerEventId,
        }) as Prisma.InputJsonValue,
      },
    });
  }

  const renewalMarker = `autopay:${mandate.id}:${input.event.providerPaymentId}`;
  let subscription = await prisma.memberSubscription.findFirst({
    where: {
      orgId: mandate.orgId,
      memberUserId: mandate.userId,
      notes: { contains: renewalMarker },
    },
  });
  let createdRenewal = false;
  if (!subscription) {
    const window = computeSubscriptionWindow(toMembershipPlanInput(plan));
    const renewalStartsAt =
      sourceSubscription.endsAt && sourceSubscription.endsAt.getTime() > Date.now()
        ? sourceSubscription.endsAt
        : window.startsAt;
    const renewalEndsAt = window.endsAt
      ? new Date(renewalStartsAt.getTime() + (window.endsAt.getTime() - window.startsAt.getTime()))
      : window.endsAt;
    subscription = await prisma.memberSubscription.create({
      data: {
        orgId: mandate.orgId,
        branchId: sourceSubscription.branchId,
        memberUserId: mandate.userId,
        planId: mandate.planId,
        status: "ACTIVE",
        startsAt: renewalStartsAt,
        ...(renewalEndsAt ? { endsAt: renewalEndsAt } : {}),
        ...(window.remainingVisits !== undefined ? { remainingVisits: window.remainingVisits } : {}),
        paymentId: payment.id,
        activatedById: mandate.userId,
        notes: renewalMarker,
      },
    });
    createdRenewal = true;
  }

  const finalMandate = await prisma.paymentMandate.update({
    where: { id: mandate.id },
    data: clean({
      status: "ACTIVE",
      latestSubscriptionId: subscription.id,
      paidCount:
        paidCount !== undefined ? paidCount : createdRenewal ? mandate.paidCount + 1 : mandate.paidCount,
      currentStartAt,
      currentEndAt,
      nextChargeAt,
      activatedAt: updatedMandate.activatedAt ?? new Date(),
    }),
  });

  await prisma.subscriptionReminder.updateMany({
    where: {
      mandateId: mandate.id,
      status: "PENDING",
      kind: { in: ["PAYMENT_FAILED", "PAYMENT_RETRY"] },
    },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  if (createdRenewal) {
    await input.ensureMembership({
      orgId: mandate.orgId,
      userId: mandate.userId,
      profilePhotoUrl: user.profilePhotoUrl,
      marketingOptIn: user.marketingOptIn,
    });
    await input.createNotification({
      orgId: mandate.orgId,
      createdById: mandate.userId,
      type: "TRANSACTIONAL",
      title: "Membership renewed by autopay",
      body: `Your ${plan.name} membership has been renewed automatically.`,
      audience: "selected_member",
      userIds: [mandate.userId],
      pushEnabled: true,
      metadata: { autopayMandateId: mandate.id, subscriptionId: subscription.id, paymentId: payment.id },
    });
  }

  return { mandate: finalMandate, payment, subscription };
}
