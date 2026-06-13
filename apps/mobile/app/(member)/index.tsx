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
  AnimatedAppear,
  HeaderMeta,
  IconBubble,
  QueryErrorState,
  ScreenHeader,
  StatStrip,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { MemberHeaderActions } from "@/components/member-header-actions";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { HomeSkeleton } from "@/components/skeletons";
import { Banners } from "@/features/member/home/banners";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { useMyTracking } from "@/lib/domains";
import { useMemberHome } from "@/lib/domains/member";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { type ActiveCheckIn, useManualCheckout } from "@/lib/use-geofence-checkout";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography } from "@/lib/theme";
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

function MembershipAccessCard({ home }: { home?: MemberHomeData }) {
  const router = useRouter();
  const { palette } = useTheme();
  const membership = home?.activeMembership;
  const organization = home?.activeOrganization;
  const plan = home?.activePlan;
  const daysLeft = membership?.daysLeft;
  const visitsLeft = membership?.remainingVisits;
  const isExpired =
    !membership ||
    String(membership.status ?? "").toLowerCase().includes("expired") ||
    (typeof daysLeft === "number" && daysLeft <= 0);
  const statusLabel = isExpired ? "Renewal needed" : "Access active";
  const detail =
    [
      typeof daysLeft === "number" ? `${Math.max(0, daysLeft)} days left` : null,
      typeof visitsLeft === "number" ? `${visitsLeft} visits left` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Membership synced with desk";

  return (
    <Card
      semanticSurface={isExpired ? "warningCard" : "successCard"}
      contentStyle={styles.membershipCard}
      accessibilityLabel={`${statusLabel}. ${plan?.name ?? "Membership"}. ${detail}. ${organization?.name ?? "Gym"}.`}
    >
      <View style={styles.membershipTop}>
        <IconBubble
          icon={isExpired ? "warning-outline" : "shield-checkmark-outline"}
          tone={isExpired ? "amber" : "lime"}
          size={44}
        />
        <View style={styles.membershipCopy}>
          <Text style={[styles.membershipEyebrow, { color: palette.text.secondary }]}>
            Membership access
          </Text>
          <Text style={[styles.membershipTitle, { color: palette.text.primary }]}>
            {plan?.name ?? "Active membership"}
          </Text>
          <Text style={[styles.membershipMeta, { color: palette.text.secondary }]}>
            {organization?.name ?? "Your gym"} · {detail}
          </Text>
        </View>
        <StatusChip status={statusLabel} tone={isExpired ? "amber" : "lime"} />
      </View>
      <View style={styles.membershipActions}>
        <ZookButton
          onPress={() => router.push("/scan" as never)}
          icon="qr-code-outline"
          style={styles.membershipAction}
          variant={isExpired ? "secondary" : "primary"}
        >
          Scan QR
        </ZookButton>
        <ZookButton
          onPress={() => router.push("/membership" as never)}
          icon={isExpired ? "card-outline" : "receipt-outline"}
          variant="secondary"
          style={styles.membershipAction}
        >
          {isExpired ? "Renew" : "Details"}
        </ZookButton>
      </View>
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
  const scrollY = useSharedValue(0);
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
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={homeQuery.isRefetching}
              onRefresh={() => void homeQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <ScreenHeader
            title={`Hello, ${firstName}`}
            contextSlot={<RoleSwitcherContextPill />}
            trailing={<MemberHeaderActions />}
            meta={
              streakDays > 0 ? (
                <HeaderMeta icon="flame">{streakDays}-day streak</HeaderMeta>
              ) : null
            }
            scrollY={scrollY}
          />

          {homeQuery.isLoading ? <HomeSkeleton /> : null}
          {homeQuery.isError ? (
            <QueryErrorState error={homeQuery.error} onRetry={() => void homeQuery.refetch()} />
          ) : null}
          {!homeQuery.isLoading && !homeQuery.isError ? (
            <>
              <AnimatedAppear delay={0}>
                <MembershipAccessCard home={home} />
              </AnimatedAppear>
              {activeCheckIn ? (
                <AnimatedAppear delay={40}>
                  <ActiveCheckInCard
                    activeCheckIn={activeCheckIn}
                    busy={checkoutBusy}
                    onStop={() => void stopActiveCheckIn("manual")}
                  />
                </AnimatedAppear>
              ) : null}
              <AnimatedAppear delay={activeCheckIn ? 80 : 40}>{renderHomeCard(state)}</AnimatedAppear>
              <AnimatedAppear delay={activeCheckIn ? 120 : 80}>
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
              </AnimatedAppear>
              <AnimatedAppear delay={activeCheckIn ? 160 : 120}>
                <Banners home={home} />
              </AnimatedAppear>
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
    gap: spacing.lg,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 20,
    width: "100%",
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
    ...typography.timer,
  },
  activeSessionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  membershipCard: {
    gap: spacing.md,
    padding: 16,
  },
  membershipTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  membershipCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  membershipEyebrow: {
    ...typography.caption,
    textTransform: "uppercase",
  },
  membershipTitle: {
    ...typography.titleSmall,
  },
  membershipMeta: {
    ...typography.small,
  },
  membershipActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  membershipAction: {
    flex: 1,
    minWidth: 132,
  },
});
