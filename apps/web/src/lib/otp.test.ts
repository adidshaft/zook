import { describe, expect, it } from "vitest";
import { sanitizeOtpValue } from "./otp";

describe("otp helpers", () => {
  it("keeps only the configured number of OTP digits", () => {
    expect(sanitizeOtpValue("12-ab56-99")).toBe("125699");
    expect(sanitizeOtpValue("12-ab56-99", 4)).toBe("1256");
    expect(sanitizeOtpValue("\uff11\uff12-\uff13\uff14\uff15\uff16")).toBe("123456");
  });
});
