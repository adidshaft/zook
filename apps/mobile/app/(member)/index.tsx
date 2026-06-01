import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import {
  GlassCard,
  IconBubble,
  MobileHeader,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { HomeSkeleton } from "@/components/skeletons";
import { Banners } from "@/features/member/home/banners";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { useMemberHome } from "@/lib/domains/member";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { layout, spacing } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme/index";

const DEFAULT_GEOFENCE_RADIUS_METERS = 150;
const GEOFENCE_EXIT_READINGS_REQUIRED = 2;
const GEOFENCE_POLL_INTERVAL_MS = 30_000;
const configuredGeofenceRadiusMeters = Number(
  process.env.EXPO_PUBLIC_ATTENDANCE_GEOFENCE_METERS ?? DEFAULT_GEOFENCE_RADIUS_METERS,
);
const GEOFENCE_RADIUS_METERS = Number.isFinite(configuredGeofenceRadiusMeters)
  ? configuredGeofenceRadiusMeters
  : DEFAULT_GEOFENCE_RADIUS_METERS;

type ActiveCheckIn = NonNullable<MemberHomeData["activeCheckIn"]>;

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function secondsSince(value: string) {
  const startedAt = new Date(value).getTime();
  if (Number.isNaN(startedAt)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
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

function ActiveCheckInCard({
  activeCheckIn,
  busy,
  onStop,
}: {
  activeCheckIn: ActiveCheckIn;
  busy: boolean;
  onStop: () => void;
}) {
  const { palette } = useTheme();
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    secondsSince(activeCheckIn.checkedInAt),
  );

  useEffect(() => {
    setElapsedSeconds(secondsSince(activeCheckIn.checkedInAt));
    const timer = setInterval(() => {
      setElapsedSeconds(secondsSince(activeCheckIn.checkedInAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCheckIn.checkedInAt]);

  return (
    <GlassCard glow contentStyle={styles.activeSessionCard}>
      <View style={styles.activeSessionHeader}>
        <IconBubble icon="time-outline" tone="lime" size={42} />
        <View style={styles.activeSessionCopy}>
          <Text style={[styles.activeSessionLabel, { color: palette.text.secondary }]}>
            Active check-in
          </Text>
          <Text style={[styles.activeSessionBranch, { color: palette.text.primary }]}>
            {activeCheckIn.branchName ?? "Current branch"}
          </Text>
        </View>
      </View>
      <Text style={[styles.activeSessionTimer, { color: palette.accent.base }]}>
        {formatDuration(elapsedSeconds)}
      </Text>
      <Text style={[styles.activeSessionHint, { color: palette.text.secondary }]}>
        Re-scan the branch QR to check out, or stop it here.
      </Text>
      <ZookButton onPress={onStop} disabled={busy} icon="stop-circle-outline" tone="secondary">
        {busy ? "Stopping..." : "Stop session"}
      </ZookButton>
    </GlassCard>
  );
}

export default function HomeScreen() {
  const { activeOrgId, session, token } = useAuth();
  const { palette } = useTheme();
  const queryClient = useQueryClient();
  const homeQuery = useMemberHome();
  const home = homeQuery.data;
  const state = deriveHomeState(home);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || "Member";
  const activeCheckIn = home?.activeCheckIn ?? null;
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const checkoutStartedRef = useRef<string | null>(null);
  const geofenceTarget = useMemo(() => {
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
  }, [activeCheckIn]);

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
    async (
      reason: "manual" | "geofence" = "manual",
      coordinates?: { latitude: number; longitude: number },
    ) => {
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
      outsideReadings = distance > GEOFENCE_RADIUS_METERS ? outsideReadings + 1 : 0;
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
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled || permission.status !== "granted") {
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
  }, [activeCheckIn, geofenceTarget, stopActiveCheckIn, token]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={homeQuery.isRefetching}
              onRefresh={() => void homeQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <MobileHeader
            eyebrow={home?.activeOrganization?.name ?? "Member"}
            title={`Hello, ${firstName}`}
            subtitle="Today in your gym"
            chip={<RoleSwitcherChip />}
            showProfileShortcut={false}
          />

          {homeQuery.isLoading ? <HomeSkeleton /> : null}
          {homeQuery.isError ? (
            <QueryErrorState error={homeQuery.error} onRetry={() => void homeQuery.refetch()} />
          ) : null}
          {!homeQuery.isLoading && !homeQuery.isError ? (
            <>
              {activeCheckIn ? (
                <ActiveCheckInCard
                  activeCheckIn={activeCheckIn}
                  busy={checkoutBusy}
                  onStop={() => void stopActiveCheckIn("manual")}
                />
              ) : null}
              <Banners home={home} />
              {renderHomeCard(state)}
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function HomeLoading() {
  const { palette } = useTheme();

  return (
    <GlassCard variant="compact" contentStyle={styles.loadingCard}>
      <IconBubble icon="flash-outline" tone="lime" size={42} />
      <View style={styles.loadingCopy}>
        <Text style={[styles.loadingTitle, { color: palette.text.primary }]}>Loading today</Text>
        <Text style={[styles.loadingBody, { color: palette.text.secondary }]}>
          Getting your membership and plan status.
        </Text>
      </View>
      <ActivityIndicator color={palette.accent.base} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 20,
    width: "100%",
  },
  loadingCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 86,
  },
  loadingCopy: { flex: 1, gap: 3 },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  loadingBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  activeSessionCard: {
    gap: spacing.md,
    padding: 16,
  },
  activeSessionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  activeSessionCopy: {
    flex: 1,
    gap: 3,
  },
  activeSessionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  activeSessionBranch: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  activeSessionTimer: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 44,
    letterSpacing: 0,
    lineHeight: 50,
  },
  activeSessionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
