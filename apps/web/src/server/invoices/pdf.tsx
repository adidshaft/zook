import { createHash } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildStorageKey, getStorageProvider } from "@zook/core/providers";
import { Prisma, prisma, type PrismaClient } from "@zook/db";
import type { InvoiceKind } from "@zook/db";
import { formatEnumLabel } from "@/lib/format";
import { buildFileAssetUrl } from "../files";
import { MembershipInvoiceTemplate } from "./templates/MembershipInvoiceTemplate";
import { SaasInvoiceTemplate } from "./templates/SaasInvoiceTemplate";
import { ShopInvoiceTemplate } from "./templates/ShopInvoiceTemplate";
import type { InvoicePdfData, InvoicePdfLineItem } from "./templates/types";

type OrgForInvoice = {
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

type UserForInvoice = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

function moneyLineDescription(value: string) {
  return formatEnumLabel(value);
}

function orgAddress(org: OrgForInvoice) {
  return [org.address, org.city, org.state, org.pincode, "India"].filter(Boolean).join(", ");
}

function invoiceTitle(input: { kind: InvoiceKind; sellerGstin?: string | null }) {
  if (input.kind === "MANUAL") return "Receipt" as const;
  return input.sellerGstin ? ("Tax Invoice" as const) : ("Bill of Supply" as const);
}

function normalizeLineItems(value: Prisma.JsonValue | null | undefined): InvoicePdfLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const description = typeof record.description === "string" ? record.description : "Invoice item";
    const quantity = Number(record.quantity ?? 1);
    const subtotalPaise = Number(record.subtotalPaise ?? record.amountPaise ?? 0);
    const gstPaise = Number(record.gstPaise ?? 0);
    const totalPaise = Number(record.totalPaise ?? subtotalPaise + gstPaise);
    return [
      {
        description,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        subtotalPaise: Number.isFinite(subtotalPaise) ? subtotalPaise : 0,
        gstPaise: Number.isFinite(gstPaise) ? gstPaise : 0,
        totalPaise: Number.isFinite(totalPaise) ? totalPaise : 0,
        hsnCode: typeof record.hsnCode === "string" ? record.hsnCode : null,
      },
    ];
  });
}

export function invoicePdfData(input: {
  invoice: {
    kind: InvoiceKind;
    invoiceNumber: string | null;
    invoiceNo: string | null;
    number: string | null;
    issueDate: Date | null;
    issuedAt: Date;
    gstNumber: string | null;
    buyerName: string | null;
    buyerAddress: string | null;
    buyerPhone: string | null;
    buyerGstin: string | null;
    lineItems: Prisma.JsonValue | null;
    subtotalPaise: number;
    gstPaise: number;
    totalPaise: number;
    amountPaise: number;
    currency: string;
  };
  org?: OrgForInvoice | null;
  user?: UserForInvoice | null;
}) {
  const invoice = input.invoice;
  const isSaas = invoice.kind === "SAAS";
  const seller = isSaas
    ? {
        name: "Kyoka Suigetsu LLP",
        address: "India",
        gstin: null,
        email: "billing@zook.app",
        phone: null,
      }
    : {
        name: input.org?.legalName || input.org?.name || "Zook gym",
        address: input.org ? orgAddress(input.org) : "India",
        gstin: invoice.gstNumber,
        email: input.org?.contactEmail ?? null,
        phone: input.org?.contactPhone ?? null,
      };
  const fallbackBuyerName = isSaas
    ? input.org?.legalName || input.org?.name || "Gym"
    : input.user?.name || input.user?.email || input.user?.phone || "Member";
  const lineItems = normalizeLineItems(invoice.lineItems);
  return {
    title: invoiceTitle({ kind: invoice.kind, sellerGstin: seller.gstin }),
    invoiceNumber: invoice.invoiceNumber ?? invoice.invoiceNo ?? invoice.number ?? "DRAFT",
    issueDate: invoice.issueDate ?? invoice.issuedAt,
    seller,
    buyer: {
      name: invoice.buyerName || fallbackBuyerName,
      address: invoice.buyerAddress,
      gstin: invoice.buyerGstin,
      phone: invoice.buyerPhone || input.user?.phone || null,
    },
    lineItems:
      lineItems.length > 0
        ? lineItems
        : [
            {
              description: `${moneyLineDescription(invoice.kind)} payment`,
              quantity: 1,
              subtotalPaise: invoice.subtotalPaise,
              gstPaise: invoice.gstPaise,
              totalPaise: invoice.totalPaise || invoice.amountPaise,
            },
          ],
    subtotalPaise: invoice.subtotalPaise,
    gstPaise: invoice.gstPaise,
    totalPaise: invoice.totalPaise || invoice.amountPaise,
    currency: invoice.currency,
    ...(isSaas
      ? { footer: "SaaS platform invoice issued by Kyoka Suigetsu LLP for Zook Gym OS." }
      : {}),
  } satisfies InvoicePdfData;
}

export async function renderInvoicePdfBuffer(input: {
  invoice: Parameters<typeof invoicePdfData>[0]["invoice"];
  org?: OrgForInvoice | null;
  user?: UserForInvoice | null;
}) {
  const data = invoicePdfData(input);
  if (input.invoice.kind === "SAAS") {
    return renderToBuffer(<SaasInvoiceTemplate invoice={data} />);
  }
  if (input.invoice.kind === "SHOP") {
    return renderToBuffer(<ShopInvoiceTemplate invoice={data} />);
  }
  return renderToBuffer(<MembershipInvoiceTemplate invoice={data} />);
}

export async function ensureInvoicePdfAsset(input: {
  invoiceId: string;
  org?: OrgForInvoice | null;
  user?: UserForInvoice | null;
  tx?: PrismaClient;
}) {
  const client = input.tx ?? prisma;
  const invoice = await client.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.pdfAssetId) return invoice;

  const pdf = await renderInvoicePdfBuffer({
    invoice,
    ...(input.org !== undefined ? { org: input.org } : {}),
    ...(input.user !== undefined ? { user: input.user } : {}),
  });
  const storageProvider = getStorageProvider();
  const invoiceNumber = invoice.invoiceNumber ?? invoice.invoiceNo ?? invoice.number ?? invoice.id;
  const filename = `${invoiceNumber.replace(/[^A-Za-z0-9._-]+/g, "_")}.pdf`;
  const storageKey = buildStorageKey({
    category: "invoice_pdf",
    orgId: invoice.orgId,
    ownerUserId: invoice.userId,
    originalName: filename,
  });
  await storageProvider.uploadFile({
    key: storageKey,
    body: pdf,
    contentType: "application/pdf",
    sizeBytes: pdf.length,
    category: "invoice_pdf",
    originalName: filename,
    visibility: "private",
    cacheControl: "private, max-age=0, no-store",
  });
  const created = await client.fileAsset.create({
    data: {
      orgId: invoice.orgId,
      ownerUserId: invoice.userId,
      originalName: filename,
      storageKey,
      url: "pending",
      mimeType: "application/pdf",
      sizeBytes: pdf.length,
      purpose: "invoice_pdf",
      category: "invoice_pdf",
      visibility: "private",
      storageProvider: storageProvider.getDiagnostics().provider,
      checksum: createHash("sha256").update(pdf).digest("hex"),
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber,
        kind: invoice.kind,
      } as Prisma.InputJsonValue,
    },
  });
  const asset = await client.fileAsset.update({
    where: { id: created.id },
    data: { url: buildFileAssetUrl(created.id) },
  });
  return client.invoice.update({
    where: { id: invoice.id },
    data: { pdfAssetId: asset.id, pdfFileAssetId: asset.id },
  });
}
