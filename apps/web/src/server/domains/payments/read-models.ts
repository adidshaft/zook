import { prisma } from "@zook/db";
import type { DashboardBranchFilter } from "@/server/domains/shared/filters";
import { serializeUserForReadModel } from "@/server/domains/shared/read-serialization";

export async function getOrganizationRecentPayments(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const payments = await prisma.payment.findMany({
    where: { orgId, ...(filters.branchId ? { branchId: filters.branchId } : {}) },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: payments.map((payment) => payment.userId).filter((id): id is string => Boolean(id)),
      },
    },
  });
  const refunds = payments.length
    ? await prisma.paymentRefund.findMany({
        where: { orgId, paymentId: { in: payments.map((payment) => payment.id) } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  return payments.map((payment) => ({
    ...payment,
    refunds: refunds.filter((refund) => refund.paymentId === payment.id),
    refundedAmountPaise: refunds
      .filter(
        (refund) =>
          refund.paymentId === payment.id && !["FAILED", "CANCELLED"].includes(refund.status),
      )
      .reduce((total, refund) => total + refund.amountPaise, 0),
    user: payment.userId ? serializeUserForReadModel(usersById.get(payment.userId) ?? null) : null,
  }));
}
