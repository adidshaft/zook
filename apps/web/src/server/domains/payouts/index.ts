import { Prisma, prisma } from "@zook/db";

export type PayoutConfigInput = {
  baseMonthlyPaise: number;
  ptCommissionPercent: number;
  perSessionFeePaise: number;
  payDay: number;
};

export function payoutPeriod(month: string | Date = new Date()) {
  const date = typeof month === "string" ? new Date(`${month}-01T00:00:00.000Z`) : month;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function calculatePayoutTotal(
  lines: Array<{ amountPaise: number | null | undefined }>,
  baseMonthlyPaise = 0,
) {
  return baseMonthlyPaise + lines.reduce((sum, line) => sum + (line.amountPaise ?? 0), 0);
}

export function calculatePtCommission(amountPaise: number, commissionPercent: number) {
  return Math.round((amountPaise * commissionPercent) / 100);
}

export function calculatePtClawback(amountPaise: number, commissionPercent: number) {
  return -calculatePtCommission(amountPaise, commissionPercent);
}

export function calculateClassCommission(amountPaise: number, commissionBps: number) {
  return Math.round((amountPaise * commissionBps) / 10_000);
}

export async function getPayoutConfig(orgId: string, trainerId: string) {
  return (
    (await prisma.trainerPayoutConfig.findUnique({
      where: { orgId_trainerId: { orgId, trainerId } },
    })) ??
    (await prisma.trainerPayoutConfig.create({
      data: { orgId, trainerId },
    }))
  );
}

export async function upsertPayoutConfig(
  orgId: string,
  trainerId: string,
  input: PayoutConfigInput,
) {
  return prisma.trainerPayoutConfig.upsert({
    where: { orgId_trainerId: { orgId, trainerId } },
    update: input,
    create: { orgId, trainerId, ...input },
  });
}

async function ensurePayout(
  tx: Prisma.TransactionClient,
  orgId: string,
  trainerId: string,
  period: Date,
) {
  const config = await tx.trainerPayoutConfig.findUnique({
    where: { orgId_trainerId: { orgId, trainerId } },
  });
  const lines = await tx.trainerPayoutLine.findMany({
    where: { orgId, trainerId, period },
  });
  const totalPaise = calculatePayoutTotal(lines, config?.baseMonthlyPaise ?? 0);
  const payout = await tx.trainerPayout.upsert({
    where: { orgId_trainerId_period: { orgId, trainerId, period } },
    update: { totalPaise },
    create: { orgId, trainerId, period, totalPaise, status: "draft" },
  });
  await tx.trainerPayoutLine.updateMany({
    where: { orgId, trainerId, period, payoutId: null },
    data: { payoutId: payout.id },
  });
  return { ...payout, totalPaise };
}

export async function accruePtSubscriptionCommission(input: {
  orgId: string;
  trainerId: string;
  subscriptionId: string;
  amountPaise: number;
  createdById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const period = payoutPeriod();
    const config = await tx.trainerPayoutConfig.findUnique({
      where: { orgId_trainerId: { orgId: input.orgId, trainerId: input.trainerId } },
    });
    const commissionPercent = config?.ptCommissionPercent ?? 0;
    const amountPaise = calculatePtCommission(input.amountPaise, commissionPercent);
    const line = await tx.trainerPayoutLine.upsert({
      where: {
        orgId_trainerId_kind_sourceId: {
          orgId: input.orgId,
          trainerId: input.trainerId,
          kind: "PT_COMMISSION",
          sourceId: input.subscriptionId,
        },
      },
      update: { amountPaise },
      create: {
        orgId: input.orgId,
        trainerId: input.trainerId,
        period,
        kind: "PT_COMMISSION",
        sourceType: "pt_subscription",
        sourceId: input.subscriptionId,
        description: `PT subscription commission (${commissionPercent}%)`,
        amountPaise,
        createdById: input.createdById ?? null,
      },
    });
    await ensurePayout(tx, input.orgId, input.trainerId, period);
    return line;
  });
}

export async function accruePtSessionFee(input: {
  orgId: string;
  trainerId: string;
  sessionLogId: string;
  sessionAt?: Date;
  createdById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const period = payoutPeriod(input.sessionAt ?? new Date());
    const config = await tx.trainerPayoutConfig.findUnique({
      where: { orgId_trainerId: { orgId: input.orgId, trainerId: input.trainerId } },
    });
    const amountPaise = config?.perSessionFeePaise ?? 0;
    const line = await tx.trainerPayoutLine.upsert({
      where: {
        orgId_trainerId_kind_sourceId: {
          orgId: input.orgId,
          trainerId: input.trainerId,
          kind: "PT_SESSION",
          sourceId: input.sessionLogId,
        },
      },
      update: { amountPaise },
      create: {
        orgId: input.orgId,
        trainerId: input.trainerId,
        period,
        kind: "PT_SESSION",
        sourceType: "pt_session",
        sourceId: input.sessionLogId,
        description: "PT session fee",
        amountPaise,
        createdById: input.createdById ?? null,
      },
    });
    await tx.personalTrainingSessionLog.update({
      where: { id: input.sessionLogId },
      data: { payoutLineId: line.id },
    });
    await ensurePayout(tx, input.orgId, input.trainerId, period);
    return line;
  });
}

export async function accrueClassBookingCommission(input: {
  orgId: string;
  trainerId: string;
  classId: string;
  paymentId: string;
  amountPaise: number;
  commissionBps?: number | null;
  className?: string | null;
  createdById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const period = payoutPeriod();
    const config = await tx.trainerPayoutConfig.findUnique({
      where: { orgId_trainerId: { orgId: input.orgId, trainerId: input.trainerId } },
    });
    const commissionBps = input.commissionBps ?? (config?.ptCommissionPercent ?? 0) * 100;
    const amountPaise = calculateClassCommission(input.amountPaise, commissionBps);
    const percentLabel = commissionBps % 100 === 0 ? `${commissionBps / 100}%` : `${commissionBps / 100}%`;
    const line = await tx.trainerPayoutLine.upsert({
      where: {
        orgId_trainerId_kind_sourceId: {
          orgId: input.orgId,
          trainerId: input.trainerId,
          kind: "CLASS_COMMISSION",
          sourceId: input.paymentId,
        },
      },
      update: { amountPaise },
      create: {
        orgId: input.orgId,
        trainerId: input.trainerId,
        period,
        kind: "CLASS_COMMISSION",
        sourceType: "class_booking",
        sourceId: input.paymentId,
        description: `Group class${input.className ? ` · ${input.className}` : ""} (${percentLabel})`,
        amountPaise,
        createdById: input.createdById ?? null,
      },
    });
    await ensurePayout(tx, input.orgId, input.trainerId, period);
    return line;
  });
}

export async function accruePtClawback(input: {
  orgId: string;
  trainerId: string;
  subscriptionId: string;
  amountPaise: number;
  createdById?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const period = payoutPeriod();
    const config = await tx.trainerPayoutConfig.findUnique({
      where: { orgId_trainerId: { orgId: input.orgId, trainerId: input.trainerId } },
    });
    const commissionPercent = config?.ptCommissionPercent ?? 0;
    const amountPaise = calculatePtClawback(input.amountPaise, commissionPercent);
    const line = await tx.trainerPayoutLine.upsert({
      where: {
        orgId_trainerId_kind_sourceId: {
          orgId: input.orgId,
          trainerId: input.trainerId,
          kind: "PT_CLAWBACK",
          sourceId: input.subscriptionId,
        },
      },
      update: { amountPaise },
      create: {
        orgId: input.orgId,
        trainerId: input.trainerId,
        period,
        kind: "PT_CLAWBACK",
        sourceType: "pt_subscription_refund",
        sourceId: input.subscriptionId,
        description: `PT refund claw-back (${commissionPercent}%)`,
        amountPaise,
        createdById: input.createdById ?? null,
      },
    });
    await ensurePayout(tx, input.orgId, input.trainerId, period);
    return line;
  });
}

export async function draftPayoutsForMonth(orgId: string, month: string | Date) {
  const period = payoutPeriod(month);
  const configs = await prisma.trainerPayoutConfig.findMany({ where: { orgId } });
  return prisma.$transaction((tx) =>
    Promise.all(configs.map((config) => ensurePayout(tx, orgId, config.trainerId, period))),
  );
}

export async function listPayouts(orgId: string, month: string | Date) {
  const period = payoutPeriod(month);
  await draftPayoutsForMonth(orgId, period);
  const [payouts, lines, trainers, configs] = await Promise.all([
    prisma.trainerPayout.findMany({ where: { orgId, period }, orderBy: { createdAt: "desc" } }),
    prisma.trainerPayoutLine.findMany({ where: { orgId, period }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({
      where: {
        id: {
          in: (
            await prisma.trainerPayout.findMany({ where: { orgId, period }, select: { trainerId: true } })
          ).map((payout) => payout.trainerId),
        },
      },
    }),
    prisma.trainerPayoutConfig.findMany({ where: { orgId } }),
  ]);
  return payouts.map((payout) => ({
    ...payout,
    trainer: trainers.find((trainer) => trainer.id === payout.trainerId) ?? null,
    config: configs.find((config) => config.trainerId === payout.trainerId) ?? null,
    lines: lines.filter((line) => line.trainerId === payout.trainerId),
  }));
}

export async function addPayoutAdjustment(input: {
  orgId: string;
  payoutId: string;
  amountPaise: number;
  description: string;
  createdById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.trainerPayout.findFirst({
      where: { id: input.payoutId, orgId: input.orgId },
    });
    if (!payout) throw new Error("Payout not found");
    const line = await tx.trainerPayoutLine.create({
      data: {
        orgId: input.orgId,
        trainerId: payout.trainerId,
        payoutId: payout.id,
        period: payout.period,
        kind: input.amountPaise < 0 ? "PENALTY" : "ADVANCE",
        description: input.description,
        amountPaise: input.amountPaise,
        createdById: input.createdById,
      },
    });
    await ensurePayout(tx, input.orgId, payout.trainerId, payout.period);
    return line;
  });
}

export async function markPayoutPaid(input: {
  orgId: string;
  payoutId: string;
  paidById: string;
  method: string;
  note?: string;
  proofFileAssetId?: string;
}) {
  const payout = await prisma.trainerPayout.findFirst({
    where: { id: input.payoutId, orgId: input.orgId },
  });
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "paid") {
    throw new Error("This payout has already been marked paid.");
  }
  return prisma.trainerPayout.update({
    where: { id: payout.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      paidById: input.paidById,
      paidMethod: input.method,
      paidNote: input.note ?? null,
      proofFileAssetId: input.proofFileAssetId ?? null,
    },
  });
}
