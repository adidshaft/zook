import { describe, expect, it } from "vitest";
import { compactLastValues } from "./last-values-core";
import { sanitizeOtpValue } from "./otp";

describe("mobile ux primitives", () => {
  it("sanitizes pasted OTP values", () => {
    expect(sanitizeOtpValue("12-ab56-99")).toBe("125699");
  });

  it("keeps last values unique and capped", () => {
    expect(compactLastValues(["bench", "squat", "row"], "squat", 3)).toEqual([
      "squat",
      "bench",
      "row",
    ]);
    expect(compactLastValues(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });
});
