import { describe, expect, it } from "vitest";
import { formatEnumLabel, joinModeLabel } from "../utils/format";

describe("core formatting helpers", () => {
  it("formats enum codes as readable labels", () => {
    expect(formatEnumLabel("PLATFORM_ADMIN")).toBe("Platform Admin");
    expect(formatEnumLabel("approval-required")).toBe("Approval Required");
    expect(formatEnumLabel("")).toBe("Unknown");
  });

  it("keeps sentence-case copy lower when requested", () => {
    expect(formatEnumLabel("RECEPTIONIST", { casing: "lower" })).toBe("receptionist");
    expect(formatEnumLabel("PLATFORM_ADMIN", { casing: "lower" })).toBe("platform admin");
  });

  it("keeps explicit join mode labels unchanged", () => {
    expect(joinModeLabel("OPEN_JOIN")).toBe("Anyone can join");
    expect(joinModeLabel("APPROVAL_REQUIRED")).toBe("Approval required");
    expect(joinModeLabel("INVITE_ONLY")).toBe("Invite only");
  });
});
