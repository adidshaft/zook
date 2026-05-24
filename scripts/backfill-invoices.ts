import { PrismaClient } from "../packages/db/src/index";
import { ensurePaymentInvoiceDocument } from "../apps/web/src/server/invoices/generate";
import { existsSync, readFileSync } from "node:fs";

let prisma: PrismaClient;

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const daysArg = process.argv.find((arg) => arg.startsWith("--days="));
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));
  return {
    apply: args.has("--apply"),
    days: daysArg ? Number(daysArg.split("=")[1]) : 90,
    limit: limitArg ? Number(limitArg.split("=")[1]) : 500,
    envFile: envFileArg?.split("=").slice(1).join("="),
  };
}

function loadEnvFile(path?: string) {
  if (!path) return;
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${path}`);
  }
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt === -1) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  const { apply, days, limit, envFile } = parseArgs();
  loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Pass --env-file=.env.test or export it first.");
  }
  prisma = new PrismaClient();
  if (!Number.isFinite(days) || days < 1 || days > 366) {
    throw new Error("--days must be between 1 and 366.");
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 5_000) {
    throw new Error("--limit must be between 1 and 5000.");
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] },
      createdAt: { gte: since },
      orgId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const existingInvoices = await prisma.invoice.findMany({
    where: { paymentId: { in: payments.map((payment) => payment.id) } },
    select: { paymentId: true },
  });
  const invoicedPaymentIds = new Set(existingInvoices.map((invoice) => invoice.paymentId).filter(Boolean));

  let created = 0;
  let skipped = 0;
  const failures: Array<{ paymentId: string; error: string }> = [];

  for (const payment of payments) {
    if (invoicedPaymentIds.has(payment.id)) {
      skipped++;
      continue;
    }
    const [org, user] = await Promise.all([
      payment.orgId ? prisma.organization.findUnique({ where: { id: payment.orgId } }) : null,
      payment.userId ? prisma.user.findUnique({ where: { id: payment.userId } }) : null,
    ]);
    if (!org || !payment.orgId) {
      skipped++;
      continue;
    }
    if (!apply) {
      created++;
      continue;
    }
    try {
      await ensurePaymentInvoiceDocument({ org, payment: { ...payment, orgId: payment.orgId }, user });
      created++;
    } catch (cause) {
      failures.push({
        paymentId: payment.id,
        error: cause instanceof Error ? cause.message : "Unknown invoice backfill error",
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        days,
        inspected: payments.length,
        wouldCreateOrCreated: created,
        skipped,
        failures,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
