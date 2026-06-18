import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import {
  ReportsService,
  canExportOrgReport,
  parseReportFilters,
  renderCsv,
  type OrgReportType,
} from "../reports-service";
import {
  assertBranchAccessForContext,
  clean,
  isAllBranchesRequest,
  pathMatches,
} from "./core";

const reportsService = new ReportsService();

function csvHeaders(fileName: string) {
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${fileName}"`,
  };
}

const reportRoutes: Record<string, OrgReportType> = {
  "members.csv": "members",
  "attendance.csv": "attendance",
  "payments.csv": "payments",
  "revenue.csv": "revenue",
  "manual-cash.csv": "manual-cash",
  "membership-sales.csv": "membership-sales",
  "expiring-members.csv": "expiring-members",
  "invoices.csv": "invoices",
  "referrals.csv": "referrals",
  "shop.csv": "shop",
  "ai-usage.csv": "ai-usage",
};

export async function handleReports(request: NextRequest, path: string[]) {
  if (
    request.method === "GET" &&
    path.length === 4 &&
    path[0] === "orgs" &&
    path[2] === "reports" &&
    path[3]
  ) {
    const orgId = path[1]!;
    const report = reportRoutes[path[3]!];
    if (!report) {
      return undefined;
    }

    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "reportExportByActor",
      `${orgId}:${userId}`,
      "Too many report exports from this account today.",
    );
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const branchId = await assertBranchAccessForContext(ctx, orgId, filters.branchId);
    const scopedFilters = clean({
      ...filters,
      branchId,
      allBranches: isAllBranchesRequest(filters.branchId),
    });

    if (
      !canExportOrgReport({
        report,
        ctx,
        actorUserId: userId,
        ...(filters.trainerId ? { trainerId: filters.trainerId } : {}),
      })
    ) {
      throw forbiddenError("You do not have permission to export this report.");
    }

    const rows: Array<Record<string, unknown>> =
      report === "members"
        ? await reportsService.membersReport(orgId, scopedFilters)
        : report === "attendance"
          ? await reportsService.attendanceReport(orgId, scopedFilters)
          : report === "payments"
            ? await reportsService.paymentsReport(orgId, scopedFilters)
            : report === "revenue"
              ? await reportsService.revenueReport(orgId, scopedFilters)
              : report === "manual-cash"
                ? await reportsService.manualCashReport(orgId, scopedFilters)
                : report === "membership-sales"
                  ? await reportsService.membershipSalesReport(orgId, scopedFilters)
                  : report === "expiring-members"
                    ? await reportsService.membershipExpiryReport(orgId, scopedFilters)
                    : report === "invoices"
                      ? await reportsService.invoiceReport(orgId, scopedFilters)
                      : report === "referrals"
                        ? await reportsService.referralReport(orgId, scopedFilters)
                        : report === "shop"
                          ? await reportsService.shopReport(orgId, scopedFilters)
                          : await reportsService.aiUsageReport(orgId, scopedFilters);

    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "report.exported",
      entityType: "report",
      entityId: report,
      metadata: {
        format: "csv",
        rowCount: rows.length,
        filters: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });

    return new NextResponse(renderCsv({ report, generatedBy: userId, rows }), {
      headers: csvHeaders(`zook-${report}.csv`),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs.csv"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "reportExportByActor",
      `${orgId}:${userId}`,
      "Too many report exports from this account today.",
    );
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const branchId = await assertBranchAccessForContext(ctx, orgId, filters.branchId);
    const scopedFilters = clean({ ...filters, branchId });
    if (!canExportOrgReport({ report: "audit-logs", ctx, actorUserId: userId })) {
      throw forbiddenError("You do not have permission to export activity history.");
    }
    const rows = await reportsService.auditLogReport(orgId, scopedFilters);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "report.exported",
      entityType: "report",
      entityId: "audit-logs",
      metadata: {
        format: "csv",
        rowCount: rows.length,
        filters: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    return new NextResponse(renderCsv({ report: "audit-logs", generatedBy: userId, rows }), {
      headers: csvHeaders("zook-audit-logs.csv"),
    });
  }

  return undefined;
}
