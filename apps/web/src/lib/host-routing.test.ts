import { describe, expect, it } from "vitest";
import {
  expectedHostForPath,
  pathBelongsToPublic,
  pathBelongsToStaff,
  pathIsShared,
} from "./host-routing";

describe("host routing", () => {
  it("matches staff paths without matching similarly named public paths", () => {
    expect(pathBelongsToStaff("/dashboard")).toBe(true);
    expect(pathBelongsToStaff("/dashboard/")).toBe(true);
    expect(pathBelongsToStaff("/dashboard/members")).toBe(true);
    expect(pathBelongsToStaff("/dashboardx")).toBe(false);
  });

  it("matches public paths", () => {
    expect(pathBelongsToPublic("/me/abc")).toBe(true);
    expect(pathBelongsToPublic("/m/abc")).toBe(true);
    expect(pathBelongsToPublic("/g/zook-demo")).toBe(true);
    expect(pathBelongsToPublic("/guardian-consent")).toBe(true);
  });

  it("treats root and auth paths as shared", () => {
    expect(pathIsShared("/")).toBe(true);
    expect(pathIsShared("/login")).toBe(true);
    expect(pathIsShared("/verify-otp")).toBe(true);
    expect(pathIsShared("/api/auth/refresh")).toBe(true);
  });

  it("resolves the expected host for known path groups", () => {
    expect(expectedHostForPath("/dashboard")).toBe("dashboard");
    expect(expectedHostForPath("/desk/front")).toBe("dashboard");
    expect(expectedHostForPath("/me/abc")).toBe("public");
    expect(expectedHostForPath("/")).toBe("either");
    expect(expectedHostForPath("/dashboardx")).toBe("either");
  });
});
