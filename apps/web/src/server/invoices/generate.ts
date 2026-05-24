import { Prisma, prisma } from "@zook/db";
import type { InvoiceKind } from "@zook/db";
import { ensureInvoicePdfAsset } from "./pdf";
import { reserveInvoiceNumber } from "./numbering";

type PaymentDocumentContext = {
  org: {
    id: string;
    name: string;
    username: string;
    legalName: string | null;
    gstNumber: string | null;
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  payment: {
    id: string;
    orgId: string | null;
    branchId: string | null;
    userId: string | null;
    purpose: string;
    amountPaise: number;
    currency: string;
    status: string;
    providerRef: string | null;
    receiptNumber: string | null;
    recordedAt: Date | null;
    createdAt: Date;
  };
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

function invoiceKindForPurpose(purpose: string): InvoiceKind {
  if (purpose === "SHOP_ORDER") return "SHOP";
  if (purpose === "PERSONAL_TRAINING") return "PT";
  if (purpose === "SAAS_BILLING") return "SAAS";
  if (purpose === "OTHER" || purpose === "MANUAL_ADJUSTMENT") return "MANUAL";
  return "MEMBERSHIP";
}

function inclusiveGstBreakdown(totalPaise: number, gstRateBps: number) {
  if (!gstRateBps) {
    return { subtotalPaise: totalPaise, gstPaise: 0, totalPaise };
  }
  const subtotalPaise = Math.round((totalPaise * 10_000) / (10_000 + gstRateBps));
  return {
    subtotalPaise,
    gstPaise: totalPaise - subtotalPaise,
    totalPaise,
  };
}

function lineDescription(purpose: string) {
  if (purpose === "SHOP_ORDER") return "Shop order";
  if (purpose === "PERSONAL_TRAINING") return "Personal training";
  if (purpose === "SAAS_BILLING") return "Zook SaaS subscription";
  if (purpose === "MANUAL_ADJUSTMENT") return "Manual invoice";
  return "Membership payment";
}

export async function ensurePaymentInvoiceDocument(ctx: PaymentDocumentContext) {
  if (ctx.payment.status !== "SUCCEEDED" && ctx.payment.status !== "PARTIALLY_REFUNDED") {
    throw new Error("Invoices can be generated only after a payment succeeds.");
  }
  const existing = await prisma.invoice.findFirst({
    where: { orgId: ctx.org.id, paymentId: ctx.payment.id },
    orderBy: { issueDate: "desc" },
  });
  if (existing?.pdfAssetId) {
    return existing;
  }
  const invoice = existing ?? (await createPaymentInvoice(ctx));
  return ensureInvoicePdfAsset({ invoiceId: invoice.id, org: ctx.org, user: ctx.user ?? null });
}

async function createPaymentInvoice(ctx: PaymentDocumentContext) {
  const issueDate = new Date();
  const kind = invoiceKindForPurpose(ctx.payment.purpose);
  const gstRateBps = ctx.org.gstNumber ? 1800 : 0;
  const totals = inclusiveGstBreakdown(ctx.payment.amountPaise, gstRateBps);
  const buyerName = ctx.user?.name ?? ctx.user?.email ?? ctx.user?.phone ?? null;
  const reserved = await prisma.$transaction(async (tx) => {
    const number = await reserveInvoiceNumber(tx, {
      orgId: ctx.org.id,
      scope: kind === "SAAS" ? "SAAS" : "ORG",
      orgCode: ctx.org.username || ctx.org.name,
      issueDate,
    });
    return tx.invoice.create({
      data: {
        orgId: ctx.org.id,
        branchId: ctx.payment.branchId,
        userId: ctx.payment.userId,
        paymentId: ctx.payment.id,
        kind,
        number: number.invoiceNumber,
        invoiceNo: number.invoiceNumber,
        invoiceNumber: number.invoiceNumber,
        financialYear: number.financialYear,
        issueDate,
        issuedAt: issueDate,
        gstNumber: ctx.org.gstNumber,
        buyerName,
        buyerPhone: ctx.user?.phone ?? null,
        lineItems: [
          {
            description: lineDescription(ctx.payment.purpose),
            quantity: 1,
            subtotalPaise: totals.subtotalPaise,
            gstPaise: totals.gstPaise,
            totalPaise: totals.totalPaise,
          },
        ] as Prisma.InputJsonValue,
        gstRateBps,
        subtotalPaise: totals.subtotalPaise,
        gstPaise: totals.gstPaise,
        totalPaise: totals.totalPaise,
        amountPaise: totals.totalPaise,
        taxPaise: totals.gstPaise,
        currency: ctx.payment.currency,
        status: ctx.payment.status as never,
        invoiceStatus: "issued",
        metadata: {
          paymentPurpose: ctx.payment.purpose,
          providerRef: ctx.payment.providerRef,
          sellerGstinStatus: ctx.org.gstNumber ? "registered" : "not_registered",
        } as Prisma.InputJsonValue,
      },
    });
  });
  return reserved;
}

export async function ensureSaasInvoiceDocument(input: {
  orgId: string;
  paymentId?: string | null;
  subscriptionId?: string | null;
  amountPaise: number;
  tier?: string;
  billingCycle?: string;
}) {
  const [org, existing] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.orgId } }),
    input.paymentId
      ? prisma.invoice.findFirst({ where: { paymentId: input.paymentId, kind: "SAAS" } })
      : Promise.resolve(null),
  ]);
  if (!org) throw new Error("Organization not found.");
  if (existing?.pdfAssetId) return existing;

  const issueDate = new Date();
  const invoice =
    existing ??
    (await prisma.$transaction(async (tx) => {
      const number = await reserveInvoiceNumber(tx, {
        orgId: null,
        scope: "SAAS",
        issueDate,
      });
      return tx.invoice.create({
        data: {
          orgId: input.orgId,
          paymentId: input.paymentId ?? null,
          subscriptionId: input.subscriptionId ?? null,
          kind: "SAAS",
          number: number.invoiceNumber,
          invoiceNo: number.invoiceNumber,
          invoiceNumber: number.invoiceNumber,
          financialYear: number.financialYear,
          issueDate,
          issuedAt: issueDate,
          buyerName: org.legalName || org.name,
          buyerAddress: [org.address, org.city, org.state, org.pincode, "India"].filter(Boolean).join(", "),
          buyerPhone: org.contactPhone,
          subtotalPaise: input.amountPaise,
          totalPaise: input.amountPaise,
          amountPaise: input.amountPaise,
          currency: "INR",
          status: "SUCCEEDED",
          invoiceStatus: "issued",
          lineItems: [
            {
              description: `Zook ${input.tier ?? "SaaS"} subscription (${input.billingCycle ?? "MONTHLY"})`,
              quantity: 1,
              subtotalPaise: input.amountPaise,
              gstPaise: 0,
              totalPaise: input.amountPaise,
            },
          ] as Prisma.InputJsonValue,
          metadata: {
            sellerName: "Kyoka Suigetsu LLP",
            sellerAddress: "India",
            billingCycle: input.billingCycle ?? "MONTHLY",
            tier: input.tier ?? "SaaS",
          } as Prisma.InputJsonValue,
        },
      });
    }));
  return ensureInvoicePdfAsset({ invoiceId: invoice.id, org });
}
