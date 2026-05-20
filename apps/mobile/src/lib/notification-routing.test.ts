import { describe, expect, it } from "vitest";
import { mapNotificationPayloadToHref, parseDeepLinkUrl } from "./notification-routing";

function parseHref(href: string) {
  const parsed = new URL(href, "https://zookfit.in");
  return {
    path: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}

describe("parseDeepLinkUrl", () => {
  it("parses app-scheme gym links", () => {
    expect(parseDeepLinkUrl("zook://g/aarogya-strength")?.href).toBe("/g/aarogya-strength");
  });

  it("parses join links with referral context", () => {
    expect(parseDeepLinkUrl("zook://join/peaklab?ref=REF123")?.href).toBe(
      "/gyms/peaklab?ref=REF123&intent=join",
    );
  });

  it("accepts trusted web deep links", () => {
    expect(
      parseDeepLinkUrl("https://zookfit.in/plan/assign_1?notificationId=notif_1")?.href,
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

    expect(mapped.path).toBe("/shop/pickup/order_1");
    expect(mapped.params).toEqual({});
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

    expect(mapped.path).toBe("/plan/assign_1");
    expect(mapped.params).toEqual({
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

  it("routes Sprint 6D notification types to exact destinations", () => {
    expect(
      mapNotificationPayloadToHref({
        type: "TRANSACTIONAL_MEMBERSHIP_RENEWED",
        subscriptionId: "sub_1",
        notificationId: "notif_membership",
      }),
    ).toBe("/membership");
    expect(
      mapNotificationPayloadToHref({
        type: "TRANSACTIONAL_ATTENDANCE_APPROVED",
        attendanceRecordId: "att_1",
        notificationId: "notif_attendance",
      }),
    ).toBe("/attendance/att_1");
    expect(
      mapNotificationPayloadToHref({
        type: "TRANSACTIONAL_ORDER_READY",
        orderId: "order_1",
        notificationId: "notif_order",
      }),
    ).toBe("/shop/pickup/order_1");
    expect(
      mapNotificationPayloadToHref({
        type: "OPERATIONAL_GYM_CLOSURE",
        notificationId: "notif_ops",
      }),
    ).toBe("/notifications/notif_ops");
    expect(
      mapNotificationPayloadToHref({
        type: "PROMOTIONAL",
        notificationId: "notif_promo",
      }),
    ).toBe("/notifications/notif_promo");
    expect(
      mapNotificationPayloadToHref({
        type: "PLAN_ASSIGNED",
        assignmentId: "assign_1",
        notificationId: "notif_plan",
      }),
    ).toBe("/plan/assign_1");
    expect(
      mapNotificationPayloadToHref({
        type: "ENGAGEMENT_WORKOUT_REMINDER",
        templateId: "template_1",
        notificationId: "notif_workout",
      }),
    ).toBe("/plan?prefill=template_1");
  });
});
