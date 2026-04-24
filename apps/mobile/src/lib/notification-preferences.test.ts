import { describe, expect, it } from "vitest";
import {
  defaultNotificationPreferences,
  mergeNotificationPreferences,
} from "./notification-preferences";

describe("mergeNotificationPreferences", () => {
  it("returns defaults when no preferences exist", () => {
    expect(mergeNotificationPreferences(undefined)).toEqual(defaultNotificationPreferences);
  });

  it("uses global preferences when there is no active organization override", () => {
    expect(
      mergeNotificationPreferences(
        [
          {
            operational: false,
            promotional: false,
            pushEnabled: true,
          },
        ],
        "org_1",
      ),
    ).toEqual({
      transactional: true,
      operational: false,
      promotional: false,
      engagement: true,
      pushEnabled: true,
      scope: "global",
    });
  });

  it("merges organization preferences over the global defaults", () => {
    expect(
      mergeNotificationPreferences(
        [
          {
            transactional: true,
            operational: false,
            promotional: true,
            engagement: true,
            pushEnabled: false,
          },
          {
            orgId: "org_2",
            operational: true,
            promotional: false,
            pushEnabled: true,
          },
        ],
        "org_2",
      ),
    ).toEqual({
      transactional: true,
      operational: true,
      promotional: false,
      engagement: true,
      pushEnabled: true,
      scope: "organization",
    });
  });
});
