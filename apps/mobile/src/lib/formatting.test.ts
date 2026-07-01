import { describe, expect, it } from "vitest";

import { formatBranchName, formatGymHeaderIdentity, formatOrgLocationLine } from "./formatting";

describe("mobile formatting", () => {
  it("trims repeated organization prefixes from branch names", () => {
    expect(formatBranchName("Zook Fitness", "Zook Fitness - Indiranagar")).toBe("Indiranagar");
    expect(formatBranchName("Zook Fitness", "Zook Fitness")).toBe("Zook Fitness");
    expect(formatBranchName("Zook Fitness", "Koramangala")).toBe("Koramangala");
  });

  it("can collapse organization-only branch labels with a caller fallback", () => {
    expect(formatBranchName("Zook Fitness", "Zook Fitness", { collapseOrgMatch: true })).toBeNull();
    expect(
      formatBranchName("Zook Fitness", "Zook Fitness", {
        collapseOrgMatch: true,
        fallback: "Main branch",
      }),
    ).toBe("Main branch");
    expect(formatBranchName("Zook Fitness", null, { fallback: "Main branch" })).toBe(
      "Main branch",
    );
  });

  it("formats organization location lines without duplicating the organization", () => {
    expect(formatOrgLocationLine("Zook Fitness", "Zook Fitness - Indiranagar", "Bengaluru")).toBe(
      "Zook Fitness, Indiranagar, Bengaluru",
    );
    expect(formatOrgLocationLine("Zook Fitness", "Zook Fitness", "Bengaluru")).toBe(
      "Zook Fitness, Bengaluru",
    );
    expect(formatOrgLocationLine(null, null, null)).toBe("No active gym");
  });

  it("formats gym headers as bold gym title plus locality and city subtitle", () => {
    expect(
      formatGymHeaderIdentity({
        address: "Koregaon Park, Lane 7, Pune",
        branchName: "Zook Fitness - Koregaon Park",
        city: "Pune",
        orgName: "Zook Fitness",
      }),
    ).toEqual({ title: "Zook Fitness", subtitle: "Koregaon Park, Pune" });

    expect(
      formatGymHeaderIdentity({
        address: "Koregaon Park, Lane 7, Pune",
        branchName: "Koregaon Park",
        city: "Pune",
        orgName: "Zook Fitness",
      }),
    ).toEqual({ title: "Zook Fitness", subtitle: "Koregaon Park, Pune" });

    expect(
      formatGymHeaderIdentity({
        address: "Lane 7, Pune, Maharashtra",
        branchName: "Aarogya Koregaon Park",
        city: "Pune",
        orgName: "Aarogya Strength Club",
      }),
    ).toEqual({ title: "Aarogya Strength Club", subtitle: "Koregaon Park, Pune" });

    expect(
      formatGymHeaderIdentity({
        address: "Pune, Maharashtra",
        branchName: "Pune",
        city: "Pune",
        orgName: "Zook Fitness",
      }),
    ).toEqual({ title: "Zook Fitness", subtitle: "Pune" });

    expect(
      formatGymHeaderIdentity({
        branchName: "Zook Fitness",
        city: "Pune",
        orgName: "Zook Fitness",
      }),
    ).toEqual({ title: "Zook Fitness", subtitle: "Pune" });
  });
});
