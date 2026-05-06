import { describe, expect, it } from "vitest";
import { mapNotificationPayloadToHref, parseDeepLinkUrl } from "./notification-routing";

function parseHref(href: string) {
  const parsed = new URL(href, "https://zook.app");
  return {
    path: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}

describe("parseDeepLinkUrl", () => {
  it("parses app-scheme gym links", () => {
    expect(parseDeepLinkUrl("zook://g/iron-house")?.href).toBe("/g/iron-house");
  });

  it("parses join links with referral context", () => {
    expect(parseDeepLinkUrl("zook://join/peaklab?ref=REF123")?.href).toBe(
      "/join/peaklab?ref=REF123",
    );
  });

  it("accepts trusted web deep links", () => {
    expect(
      parseDeepLinkUrl("https://staging.zook.app/plan/assign_1?notificationId=notif_1")?.href,
    ).toBe("/plan/assign_1?notificationId=notif_1");
  });

  it("rejects untrusted hosts", () => {
    expect(parseDeepLinkUrl("https://example.com/plan/assign_1")).toBeNull();
  });
});

describe("mapNotificationPayloadToHref", () => {
  it("routes order notifications to the shop pickup screen", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({
        orderId: "order_1",
        notificationId: "notif_1",
        orgId: "org_1",
      }),
    );

    expect(mapped.path).toBe("/shop");
    expect(mapped.params).toEqual({
      orderId: "order_1",
      focus: "shop-order",
      notificationId: "notif_1",
      orgId: "org_1",
    });
  });

  it("routes membership notifications to the membership screen", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({ subscriptionId: "sub_1", notificationId: "notif_2" }),
    );

    expect(mapped.path).toBe("/membership");
    expect(mapped.params).toEqual({
      focus: "membership",
      notificationId: "notif_2",
      subscriptionId: "sub_1",
    });
  });

  it("routes join request notifications to membership continuation", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({
        joinRequestId: "join_1",
        notificationId: "notif_join",
        orgId: "org_1",
      }),
    );

    expect(mapped.path).toBe("/membership");
    expect(mapped.params).toEqual({
      focus: "join-request",
      joinRequestId: "join_1",
      notificationId: "notif_join",
      orgId: "org_1",
    });
  });

  it("routes plan notifications to the plans screen", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({ assignmentId: "assign_1", notificationId: "notif_3" }),
    );

    expect(mapped.path).toBe("/plans");
    expect(mapped.params).toEqual({
      assignmentId: "assign_1",
      focus: "plan",
      notificationId: "notif_3",
    });
  });

  it("routes attendance notifications to the attendance screen", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({ attendanceRecordId: "att_1", notificationId: "notif_4" }),
    );

    expect(mapped.path).toBe("/attendance/att_1");
    expect(mapped.params).toEqual({
      focus: "attendance",
      notificationId: "notif_4",
    });
  });

  it("routes generic notifications to the notification detail alias", () => {
    const mapped = parseHref(
      mapNotificationPayloadToHref({ notificationId: "notif_5", title: "General update" }),
    );

    expect(mapped.path).toBe("/notifications/notif_5");
    expect(mapped.params).toEqual({});
  });
});
