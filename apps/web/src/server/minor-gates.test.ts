import { describe, expect, it } from "vitest";
import { assertMinorConsentGranted } from "./minor-gates";

describe("assertMinorConsentGranted", () => {
  it("blocks pending minor actions", () => {
    expect(() =>
      assertMinorConsentGranted({
        isMinor: true,
        guardianPending: true,
        action: "membership activation"
      }),
    ).toThrow(/Guardian consent required before membership activation/);
  });

  it("allows verified minors", () => {
    expect(() =>
      assertMinorConsentGranted({
        isMinor: true,
        guardianPending: false,
        action: "attendance check-in"
      }),
    ).not.toThrow();
  });

  it("allows adults", () => {
    expect(() =>
      assertMinorConsentGranted({
        isMinor: false,
        guardianPending: false,
        action: "plan assignment"
      }),
    ).not.toThrow();
  });
});
