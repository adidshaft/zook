import { describe, expect, it } from "vitest";
import {
  formatIndiaPhoneInput,
  isValidGstin,
  normalizeGstinInput,
  normalizeIndiaPhoneDigits,
  normalizeIndianPincodeInput,
} from "./format";

describe("format helpers", () => {
  it("normalizes India phone input to local digits", () => {
    expect(normalizeIndiaPhoneDigits("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndiaPhoneDigits("09876543210")).toBe("9876543210");
    expect(normalizeIndiaPhoneDigits("919876543210")).toBe("9876543210");
    expect(formatIndiaPhoneInput("98765 43210")).toBe("+91 9876543210");
  });

  it("normalizes Indian pincode input", () => {
    expect(normalizeIndianPincodeInput("56 00-34 extra")).toBe("560034");
    expect(normalizeIndianPincodeInput("abc")).toBe("");
  });

  it("normalizes and validates GSTIN input", () => {
    expect(normalizeGstinInput("22 aaaaa 0000 a 1 z 5 extra")).toBe("22AAAAA0000A1Z5");
    expect(isValidGstin("22AAAAA0000A1Z5")).toBe(true);
    expect(isValidGstin("22AAAAA0000A0Z5")).toBe(false);
  });
});
