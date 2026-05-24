import { describe, expect, it } from "vitest";
import {
  buildPhase6InvoiceNumber,
  invoiceFinancialYear,
  invoiceOrgCode,
} from "./invoices/numbering";

describe("phase 6 invoice numbering", () => {
  it("uses the Indian financial year boundary", () => {
    expect(invoiceFinancialYear(new Date("2026-03-31T23:59:59.000Z"))).toBe("2025-26");
    expect(invoiceFinancialYear(new Date("2026-04-01T00:00:00.000Z"))).toBe("2026-27");
  });

  it("builds org and SaaS invoice numbers in the required format", () => {
    expect(invoiceOrgCode("Kyoka Gym - Pune")).toBe("KYOKAGYM");
    expect(
      buildPhase6InvoiceNumber({
        scope: "ORG",
        orgCode: "Kyoka Gym - Pune",
        financialYear: "2026-27",
        sequence: 7,
      }),
    ).toBe("ZK-KYOKAGYM-2026-27/00007");
    expect(
      buildPhase6InvoiceNumber({
        scope: "SAAS",
        financialYear: "2026-27",
        sequence: 12,
      }),
    ).toBe("ZK-SAAS-2026-27/00012");
  });
});
