import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useRequestPermissionWithRationale } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { useMemberHome } from "@/lib/domains/member";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { showToast } from "@/lib/toast";

const DEFAULT_GEOFENCE_RADIUS_METERS = 150;
export const GEOFENCE_EXIT_READINGS_REQUIRED = 2;
const GEOFENCE_POLL_INTERVAL_MS = 30_000;
const configuredGeofenceRadiusMeters = Number(
  process.env.EXPO_PUBLIC_ATTENDANCE_GEOFENCE_METERS ?? DEFAULT_GEOFENCE_RADIUS_METERS,
);
export const GEOFENCE_RADIUS_METERS = Number.isFinite(configuredGeofenceRadiusMeters)
  ? configuredGeofenceRadiusMeters
  : DEFAULT_GEOFENCE_RADIUS_METERS;

export type ActiveCheckIn = NonNullable<MemberHomeData["activeCheckIn"]>;
type Coordinates = { latitude: number; longitude: number };

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function nextGeofenceExitCount(input: {
  currentCount: number;
  distanceMeters: number;
  radiusMeters: number;
}) {
  return input.distanceMeters > input.radiusMeters ? input.currentCount + 1 : 0;
}

function geofenceTargetFor(activeCheckIn?: ActiveCheckIn | null): Coordinates | null {
  if (
    activeCheckIn?.branchLatitude == null ||
    activeCheckIn.branchLongitude == null ||
    activeCheckIn.checkedOutAt
  ) {
    return null;
  }
  return {
    latitude: activeCheckIn.branchLatitude,
    longitude: activeCheckIn.branchLongitude,
  };
}

function useCheckoutActiveCheckIn() {
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const homeQuery = useMemberHome();
  const activeCheckIn = homeQuery.data?.activeCheckIn ?? null;
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const checkoutStartedRef = useRef<string | null>(null);

  const applyCheckoutToCache = useCallback(
    (attendance: ActiveCheckIn) => {
      const mergeHome = (current?: MemberHomeData) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          activeCheckIn: null,
          recentAttendance: current.recentAttendance.map((record) =>
            record.id === attendance.id
              ? {
                  ...record,
                  checkedOutAt: attendance.checkedOutAt,
                  checkoutReason: attendance.checkoutReason,
                  durationSeconds: attendance.durationSeconds,
                }
              : record,
          ),
        };
      };
      queryClient.setQueryData<MemberHomeData>(["me", "home", activeOrgId ?? null], mergeHome);
      queryClient.setQueryData<{ home: MemberHomeData }>(
        ["me", "dashboard", activeOrgId ?? null],
        (current) =>
          current ? { ...current, home: mergeHome(current.home) ?? current.home } : current,
      );
    },
    [activeOrgId, queryClient],
  );

  const stopActiveCheckIn = useCallback(
    async (reason: "manual" | "geofence" = "manual", coordinates?: Coordinates) => {
      if (!token || !activeCheckIn || checkoutStartedRef.current === activeCheckIn.id) {
        return;
      }
      checkoutStartedRef.current = activeCheckIn.id;
      setCheckoutBusy(true);
      try {
        const result = await attendanceApi.checkout<{ attendance: ActiveCheckIn }>({
          token,
          orgId: activeOrgId ?? undefined,
          attendanceRecordId: activeCheckIn.id,
          body: {
            reason,
            ...(coordinates
              ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
              : {}),
          },
        });
        applyCheckoutToCache(result.attendance);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          tone: "success",
          title: reason === "geofence" ? "Checked out automatically" : "Session stopped",
          message: "Your gym time was recorded.",
        });
      } catch (error) {
        checkoutStartedRef.current = null;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({
          tone: "danger",
          title: "Could not check out",
          message: error instanceof Error ? error.message : "Try again in a moment.",
        });
      } finally {
        setCheckoutBusy(false);
      }
    },
    [activeCheckIn, activeOrgId, applyCheckoutToCache, queryClient, token],
  );

  useEffect(() => {
    checkoutStartedRef.current = null;
  }, [activeCheckIn?.id]);

  return { activeCheckIn, checkoutBusy, stopActiveCheckIn, token };
}

export function useManualCheckout() {
  const { activeCheckIn, checkoutBusy, stopActiveCheckIn } = useCheckoutActiveCheckIn();
  return { activeCheckIn, checkoutBusy, stopActiveCheckIn };
}

export function useGeofenceCheckout(): {
  activeCheckIn: ActiveCheckIn | null;
  checkoutBusy: boolean;
  permissionSheet: ReactNode;
  stopActiveCheckIn: ReturnType<typeof useCheckoutActiveCheckIn>["stopActiveCheckIn"];
} {
  const { activeCheckIn, checkoutBusy, stopActiveCheckIn, token } = useCheckoutActiveCheckIn();
  const locationPermission = useRequestPermissionWithRationale("location");
  const { permissionSheet, requestPermission } = locationPermission;
  const geofenceTarget = useMemo(() => geofenceTargetFor(activeCheckIn), [activeCheckIn]);

  useEffect(() => {
    if (!activeCheckIn || !geofenceTarget || !token) {
      return;
    }
    let subscription: Location.LocationSubscription | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let outsideReadings = 0;
    let checkoutTriggered = false;

    const handlePosition = (position: Location.LocationObject) => {
      if (cancelled || checkoutTriggered) {
        return;
      }
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const distance = distanceMeters(current, geofenceTarget);
      outsideReadings = nextGeofenceExitCount({
        currentCount: outsideReadings,
        distanceMeters: distance,
        radiusMeters: GEOFENCE_RADIUS_METERS,
      });
      if (outsideReadings >= GEOFENCE_EXIT_READINGS_REQUIRED) {
        checkoutTriggered = true;
        subscription?.remove();
        if (pollTimer) {
          clearInterval(pollTimer);
        }
        void stopActiveCheckIn("geofence", current);
      }
    };

    const pollLocation = async () => {
      try {
        handlePosition(
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
        );
      } catch {
        // watchPositionAsync remains the primary signal; polling is best-effort.
      }
    };

    void (async () => {
      const granted = await requestPermission();
      if (cancelled || !granted) {
        return;
      }
      void pollLocation();
      pollTimer = setInterval(() => {
        void pollLocation();
      }, GEOFENCE_POLL_INTERVAL_MS);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: GEOFENCE_POLL_INTERVAL_MS,
        },
        handlePosition,
      );
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [activeCheckIn, geofenceTarget, requestPermission, stopActiveCheckIn, token]);

  return {
    activeCheckIn,
    checkoutBusy,
    permissionSheet,
    stopActiveCheckIn,
  };
}
