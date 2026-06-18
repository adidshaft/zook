import { describe, expect, it } from "vitest";

import { formatBranchName, formatOrgLocationLine } from "./formatting";

describe("mobile formatting", () => {
  it("trims repeated organization prefixes from branch names", () => {
    expect(formatBranchName("Zook Fitness", "Zook Fitness - Indiranagar")).toBe("Indiranagar");
    expect(formatBranchName("Zook Fitness", "Zook Fitness")).toBe("Zook Fitness");
    expect(formatBranchName("Zook Fitness", "Koramangala")).toBe("Koramangala");
  });

  it("formats organization location lines without duplicating the organization", () => {
    expect(formatOrgLocationLine("Zook Fitness", "Zook Fitness - Indiranagar", "Bengaluru")).toBe(
      "Zook Fitness · Indiranagar, Bengaluru",
    );
    expect(formatOrgLocationLine("Zook Fitness", "Zook Fitness", "Bengaluru")).toBe(
      "Zook Fitness, Bengaluru",
    );
    expect(formatOrgLocationLine(null, null, null)).toBe("No active gym");
  });
});
