import { describe, expect, it } from "vitest";
import { normalizeUsernameInput } from "../services/organization-service";
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

  it("normalizes public username input without enforcing final validity", () => {
    expect(normalizeUsernameInput(" Zook Gym! 2026 ")).toBe("zookgym2026");
    expect(normalizeUsernameInput("AB-12_x")).toBe("ab-12x");
    expect(normalizeUsernameInput("IR")).toBe("ir");
  });
});
