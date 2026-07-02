import { describe, expect, it } from "vitest";

import { compareAppVersions } from "./app-version-utils";

describe("compareAppVersions", () => {
  it("orders semantic app versions by numeric segments", () => {
    expect(compareAppVersions("1.2.2", "1.2.3")).toBe(-1);
    expect(compareAppVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareAppVersions("1.3.0", "1.2.99")).toBe(1);
  });

  it("treats missing patch segments as zero", () => {
    expect(compareAppVersions("2.0", "2.0.0")).toBe(0);
    expect(compareAppVersions("2", "2.0.1")).toBe(-1);
  });
});
