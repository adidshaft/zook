import type { AuthSessionSummary, OrgRole } from "@zook/core";
import { describe, expect, it } from "vitest";
import {
  accountDestinationLabel,
  destinationToHref,
  destinationToUrl,
  publicAccountDestination,
  resolvePostLoginDestination,
} from "./auth-destinations";

function session({
  roles = [],
  isPlatformAdmin = false,
  privateHandle = "member-123",
}: {
  roles?: OrgRole[];
  isPlatformAdmin?: boolean;
  privateHandle?: string;
} = {}): AuthSessionSummary {
  const activeOrganization =
    roles.length > 0
      ? {
          orgId: "org_1",
          name: "Zook Gym",
          username: "zook-gym",
          status: "ACTIVE" as const,
          city: "Bengaluru",
          state: "Karnataka",
          roles,
          permissions: [],
          joinedAt: new Date("2024-01-01T00:00:00.000Z"),
        }
      : undefined;

  return {
    user: {
      id: "user_1",
      email: "member@zook.local",
      name: "Zook Member",
      ...(privateHandle ? { privateHandle } : {}),
      isMinor: false,
      guardianPending: false,
      isPlatformAdmin,
      marketingOptIn: false,
      aiConsent: true,
    },
    organizations: activeOrganization ? [activeOrganization] : [],
    ...(activeOrganization ? { activeOrgId: activeOrganization.orgId, activeOrganization } : {}),
  };
}

describe("auth destinations", () => {
  it("routes platform admins to the dashboard platform surface first", () => {
    expect(
      resolvePostLoginDestination(session({ roles: ["MEMBER"], isPlatformAdmin: true })),
    ).toEqual({ host: "dashboard", path: "/platform" });
  });

  it.each([
    [["OWNER" as OrgRole], { host: "dashboard", path: "/dashboard" }],
    [["ADMIN" as OrgRole], { host: "dashboard", path: "/dashboard" }],
    [["RECEPTIONIST" as OrgRole], { host: "dashboard", path: "/desk" }],
    [["TRAINER" as OrgRole], { host: "dashboard", path: "/coach" }],
    [["MEMBER" as OrgRole], { host: "public", path: "/me/member-123" }],
  ])("maps %j sessions to the canonical destination", (roles, expected) => {
    expect(resolvePostLoginDestination(session({ roles }))).toEqual(expected);
  });

  it("falls back to /me for members without a private handle", () => {
    expect(resolvePostLoginDestination(session({ roles: ["MEMBER"], privateHandle: "" }))).toEqual({
      host: "public",
      path: "/me",
    });
  });

  it("honors requested paths on the session destination host", () => {
    expect(
      resolvePostLoginDestination(
        session({ roles: ["OWNER"] }),
        "/dashboard/members?branchId=branch_1",
      ),
    ).toEqual({ host: "dashboard", path: "/dashboard/members?branchId=branch_1" });
    expect(resolvePostLoginDestination(session({ roles: ["MEMBER"] }), "/checkout/cs_123")).toEqual(
      {
        host: "public",
        path: "/checkout/cs_123",
      },
    );
  });

  it("keeps start-gym as an authenticated onboarding destination before owner roles exist", () => {
    expect(resolvePostLoginDestination(session(), "/start-gym")).toEqual({
      host: "dashboard",
      path: "/start-gym",
    });
    expect(resolvePostLoginDestination(session({ roles: ["MEMBER"] }), "/start-gym")).toEqual({
      host: "dashboard",
      path: "/start-gym",
    });
  });

  it("ignores requested paths that point at the wrong host", () => {
    expect(resolvePostLoginDestination(session({ roles: ["OWNER"] }), "/me/member-123")).toEqual({
      host: "dashboard",
      path: "/dashboard",
    });
    expect(resolvePostLoginDestination(session({ roles: ["MEMBER"] }), "/dashboard")).toEqual({
      host: "public",
      path: "/me/member-123",
    });
  });

  it("does not honor dashboard paths outside the user's role surface", () => {
    expect(
      resolvePostLoginDestination(session({ roles: ["RECEPTIONIST"] }), "/dashboard/members"),
    ).toEqual({ host: "dashboard", path: "/desk" });
    expect(resolvePostLoginDestination(session({ roles: ["TRAINER"] }), "/desk")).toEqual({
      host: "dashboard",
      path: "/coach",
    });
    expect(
      resolvePostLoginDestination(
        session({ roles: ["OWNER"], isPlatformAdmin: true }),
        "/dashboard",
      ),
    ).toEqual({ host: "dashboard", path: "/platform" });
  });

  it("converts destinations to absolute URLs only when crossing hosts", () => {
    const origins = {
      public: "https://zookfit.in",
      dashboard: "https://dashboard.zookfit.in",
    };
    const dashboardDestination = { host: "dashboard" as const, path: "/desk" };

    expect(destinationToUrl(dashboardDestination, origins)).toBe(
      "https://dashboard.zookfit.in/desk",
    );
    expect(destinationToHref(dashboardDestination, "dashboard", origins)).toBe("/desk");
    expect(destinationToHref(dashboardDestination, "public", origins)).toBe(
      "https://dashboard.zookfit.in/desk",
    );
  });

  it("resolves public account destinations and labels", () => {
    const destination = publicAccountDestination(session({ roles: ["TRAINER"] }));
    expect(destination).toEqual({ host: "dashboard", path: "/coach" });
    expect(
      destination &&
        accountDestinationLabel(destination, {
          dashboard: "Dashboard",
          desk: "Desk",
          coach: "Coach",
          membership: "Membership",
        }),
    ).toBe("Coach");
  });
});
