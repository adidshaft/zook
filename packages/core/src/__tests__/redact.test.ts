import { describe, expect, it } from "vitest";
import { redactPII } from "../utils/redact";

describe("redactPII", () => {
  it("redacts sensitive keys recursively", () => {
    expect(
      redactPII({
        email: "person@example.com",
        nested: {
          accessToken: "secret-token",
          keep: "visible",
          phoneNumber: "+919999999999",
        },
        rows: [{ otpCode: "000000", amount: 5000 }],
      }),
    ).toEqual({
      email: "[REDACTED]",
      nested: {
        accessToken: "[REDACTED]",
        keep: "visible",
        phoneNumber: "[REDACTED]",
      },
      rows: [{ otpCode: "[REDACTED]", amount: 5000 }],
    });
  });

  it("redacts expanded PII key names and string values inside arrays", () => {
    expect(
      redactPII({
        user_phone: "+91 98765 43210",
        contact_email: "member@example.com",
        events: ["email member@example.com", { guardianAddress: "221B Baker Street" }],
      }),
    ).toEqual({
      user_phone: "[REDACTED]",
      contact_email: "[REDACTED]",
      events: ["email [REDACTED_EMAIL]", { guardianAddress: "[REDACTED]" }],
    });
  });

  it("handles circular arrays without recursing forever", () => {
    const rows: unknown[] = [];
    rows.push(rows);

    expect(redactPII({ rows })).toEqual({ rows: ["[Circular]"] });
  });
});
