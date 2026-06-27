import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Error: "error", Success: "success" },
  notificationAsync: vi.fn(),
}));

vi.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getCurrentPositionAsync: vi.fn(),
  watchPositionAsync: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

vi.mock("@/components/primitives", () => ({
  useRequestPermissionWithRationale: () => ({
    permissionSheet: null,
    requestPermission: vi.fn(async () => false),
  }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ activeOrgId: null, token: null }),
}));

vi.mock("@/lib/domain-api", () => ({
  attendanceApi: { checkout: vi.fn() },
}));

vi.mock("@/lib/domains/member", () => ({
  useMemberHome: () => ({ data: null }),
}));

vi.mock("@/lib/i18n", () => ({
  useT: () => (key: string) => key,
}));

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

import {
  GEOFENCE_EXIT_READINGS_REQUIRED,
  distanceMeters,
  nextGeofenceExitCount,
} from "./use-geofence-checkout";

describe("geofence checkout helpers", () => {
  it("calculates distance between two coordinates in meters", () => {
    const distance = distanceMeters(
      { latitude: 18.5204, longitude: 73.8567 },
      { latitude: 18.5214, longitude: 73.8567 },
    );

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });

  it("counts consecutive outside-radius readings and resets inside-radius readings", () => {
    const radiusMeters = 150;
    const firstOutside = nextGeofenceExitCount({
      currentCount: 0,
      distanceMeters: 151,
      radiusMeters,
    });
    const secondOutside = nextGeofenceExitCount({
      currentCount: firstOutside,
      distanceMeters: 180,
      radiusMeters,
    });
    const resetInside = nextGeofenceExitCount({
      currentCount: secondOutside,
      distanceMeters: 80,
      radiusMeters,
    });

    expect(firstOutside).toBe(1);
    expect(secondOutside).toBe(GEOFENCE_EXIT_READINGS_REQUIRED);
    expect(resetInside).toBe(0);
  });
});
