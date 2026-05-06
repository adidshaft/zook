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
});
