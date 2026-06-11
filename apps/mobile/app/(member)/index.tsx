import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Card,
  IconBubble,
  MobileHeader,
  Pill,
  QueryErrorState,
  StatStrip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { HomeSkeleton } from "@/components/skeletons";
import { Banners } from "@/features/member/home/banners";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { useMyTracking } from "@/lib/domains";
import { useMemberHome } from "@/lib/domains/member";
import { type ActiveCheckIn, useManualCheckout } from "@/lib/use-geofence-checkout";
import { layout, spacing } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

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
    <Card glow contentStyle={styles.activeSessionCard}>
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
      <ZookButton onPress={onStop} disabled={busy} icon="stop-circle-outline" variant="secondary">
        {busy ? "Stopping..." : "Stop session"}
      </ZookButton>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { palette } = useTheme();
  const homeQuery = useMemberHome();
  const trackingQuery = useMyTracking();
  const home = homeQuery.data;
  const state = deriveHomeState(home);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || "Member";
  const { activeCheckIn, checkoutBusy, stopActiveCheckIn } = useManualCheckout();
  const streakDays = home?.streakDays ?? 0;
  const weeklyVisits = countThisWeek(home?.recentAttendance ?? []);
  const activeMinutes = Math.round((trackingQuery.data?.summary.totalDuration ?? 0) / 60);
  const workoutsLogged = trackingQuery.data?.summary.weeklyCount ?? 0;
  const habitsDone = trackingQuery.data?.habits.length ?? 0;

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
            chip={
              <View style={styles.headerChips}>
                <RoleSwitcherChip />
                {streakDays > 0 ? (
                  <Pill tone="amber" icon="flame">
                    {streakDays}-day streak
                  </Pill>
                ) : null}
              </View>
            }
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
              {renderHomeCard(state)}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open progress"
                onPress={() => router.push("/progress" as never)}
                style={({ pressed }) => (pressed ? styles.statStripPressed : null)}
              >
                <StatStrip
                  items={[
                    { label: "Visits", value: String(weeklyVisits), icon: "walk-outline" },
                    { label: "Active", value: formatMinutes(activeMinutes), icon: "time-outline" },
                    { label: "Workouts", value: String(workoutsLogged), icon: "barbell-outline" },
                    { label: "Habits", value: String(habitsDone), icon: "checkmark-circle-outline" },
                  ]}
                />
              </Pressable>
              <Banners home={home} />
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function startOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function countThisWeek(records: Array<{ checkedInAt?: string | null }>) {
  const weekStart = startOfWeek();
  return records.filter((record) => {
    const timestamp = record.checkedInAt ? new Date(record.checkedInAt).getTime() : Number.NaN;
    return Number.isFinite(timestamp) && timestamp >= weekStart;
  }).length;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h${remaining}m` : `${hours}h`;
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
  headerChips: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  statStripPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
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
