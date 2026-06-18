import { describe, expect, it } from "vitest";
import { normalizeIndianPincodeInput } from "./format";

describe("format helpers", () => {
  it("normalizes Indian pincode input", () => {
    expect(normalizeIndianPincodeInput("56 00-34 extra")).toBe("560034");
    expect(normalizeIndianPincodeInput("abc")).toBe("");
  });
});
