import { Prisma, type PrismaClient } from "@zook/db";

export type InvoiceNumberScope = "ORG" | "SAAS";
export const platformInvoiceSequenceOrgId = "__platform__";
const missingOrgInvoiceSequenceOrgId = "__missing_org__";

export function invoiceFinancialYear(issueDate: Date) {
  const year = issueDate.getUTCFullYear();
  const month = issueDate.getUTCMonth() + 1;
  const starts = month >= 4 ? year : year - 1;
  return `${starts}-${String(starts + 1).slice(-2)}`;
}

export function invoiceOrgCode(value: string | null | undefined) {
  const code = (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  return code || "ORG";
}

export function buildPhase6InvoiceNumber(input: {
  scope: InvoiceNumberScope;
  orgCode?: string | null;
  financialYear: string;
  sequence: number;
}) {
  if (!Number.isInteger(input.sequence) || input.sequence <= 0) {
    throw new Error("Invoice sequence must be a positive integer.");
  }
  const seq = String(input.sequence).padStart(5, "0");
  if (input.scope === "SAAS") {
    return `ZK-SAAS-${input.financialYear}/${seq}`;
  }
  return `ZK-${invoiceOrgCode(input.orgCode)}-${input.financialYear}/${seq}`;
}

export async function reserveInvoiceNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  input: {
    orgId?: string | null;
    scope: InvoiceNumberScope;
    orgCode?: string | null;
    issueDate: Date;
  },
) {
  const financialYear = invoiceFinancialYear(input.issueDate);
  const orgId =
    input.scope === "SAAS"
      ? platformInvoiceSequenceOrgId
      : (input.orgId ?? missingOrgInvoiceSequenceOrgId);
  const sequence = await tx.invoiceSequence.upsert({
    where: {
      orgId_scope_financialYear: {
        orgId,
        scope: input.scope,
        financialYear,
      },
    },
    create: {
      orgId,
      scope: input.scope,
      financialYear,
      nextSequence: 2,
    },
    update: {
      nextSequence: { increment: 1 },
    },
  });
  const reserved = sequence.nextSequence - 1;
  return {
    financialYear,
    sequence: reserved,
    invoiceNumber: buildPhase6InvoiceNumber({
      scope: input.scope,
      ...(input.orgCode !== undefined ? { orgCode: input.orgCode } : {}),
      financialYear,
      sequence: reserved,
    }),
  };
}
