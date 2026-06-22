import { prisma } from "@zook/db";
import { serializeUserForReadModel } from "@/server/domains/shared/read-serialization";

export async function getOrganizationPaymentsPage(input: {
  orgId: string;
  branchId?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const payments = await prisma.payment.findMany({
    where: {
      orgId: input.orgId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
    },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const items = payments.slice(0, limit);
  const nextCursor = payments.length > limit ? items.at(-1)?.id ?? null : null;
  const users = await prisma.user.findMany({
    where: {
      id: { in: items.map((payment) => payment.userId).filter(Boolean) as string[] },
    },
  });
  const refunds = items.length
    ? await prisma.paymentRefund.findMany({
        where: { orgId: input.orgId, paymentId: { in: items.map((payment) => payment.id) } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  return {
    payments: items.map((payment) => {
      const user = payment.userId ? usersById.get(payment.userId) : undefined;
      const paymentRefunds = refunds.filter((refund) => refund.paymentId === payment.id);
      return {
        ...payment,
        refunds: paymentRefunds,
        refundedAmountPaise: paymentRefunds
          .filter((refund) => !["FAILED", "CANCELLED"].includes(refund.status))
          .reduce((total, refund) => total + refund.amountPaise, 0),
        user: serializeUserForReadModel(user ?? null),
      };
    }),
    nextCursor,
    limit,
  };
}

export async function getOrganizationRecentPayments(
  orgId: string,
  input: { branchId?: string | undefined } = {},
) {
  const page = await getOrganizationPaymentsPage({
    orgId,
    branchId: input.branchId,
    limit: 20,
  });
  return page.payments;
}
