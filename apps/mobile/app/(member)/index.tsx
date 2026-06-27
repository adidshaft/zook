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

import { Ionicons } from "@expo/vector-icons";

import {
  Card,
  AnimatedAppear,
  HeaderActions,
  HeaderMeta,
  IconBubble,
  QueryErrorState,
  ScreenHeader,
  StatStrip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { HomeSkeleton } from "@/components/skeletons";
import { Banners } from "@/features/member/home/banners";
import { ClassesStrip } from "@/features/member/home/classes-strip";
import { CoachingStrip } from "@/features/member/home/coaching-strip";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { useMyTracking } from "@/lib/domains";
import { useMemberHome } from "@/lib/domains/member";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { formatCompactMinutes, formatElapsedTimer } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { type ActiveCheckIn, useManualCheckout } from "@/lib/use-geofence-checkout";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

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
  const t = useT();
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
    <Card contentStyle={styles.activeSessionCard}>
      <View style={styles.activeSessionHeader}>
        <IconBubble icon="time-outline" tone="blue" size={42} />
        <View style={styles.activeSessionCopy}>
          <Text style={[styles.activeSessionLabel, { color: palette.text.secondary }]}>
            {t("member.home.activeCheckIn")}
          </Text>
          <Text style={[styles.activeSessionBranch, { color: palette.text.primary }]}>
            {activeCheckIn.branchName ?? t("member.home.currentBranch")}
          </Text>
        </View>
      </View>
      <Text style={[styles.activeSessionTimer, { color: palette.accent.base }]}>
        {formatElapsedTimer(elapsedSeconds)}
      </Text>
      <Text style={[styles.activeSessionHint, { color: palette.text.secondary }]}>
        {t("member.home.activeCheckInHint")}
      </Text>
      <ZookButton onPress={onStop} disabled={busy} icon="stop-circle-outline" variant="secondary">
        {busy ? t("member.home.stoppingSession") : t("member.home.stopSession")}
      </ZookButton>
    </Card>
  );
}

function MembershipAccessCard({ home }: { home?: MemberHomeData }) {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const membership = home?.activeMembership;
  const organization = home?.activeOrganization;
  const daysLeft = membership?.daysLeft;
  const visitsLeft = membership?.remainingVisits;
  const hasMembership = Boolean(membership);
  const isExpired =
    hasMembership &&
    (String(membership?.status ?? "").toLowerCase().includes("expired") ||
      (typeof daysLeft === "number" && daysLeft <= 0));
  const needsAction = !hasMembership || isExpired;
  const statusLabel = !hasMembership
    ? t("member.home.noActiveMembership")
    : isExpired
      ? t("member.home.renewalNeeded")
      : t("member.home.accessActive");
  const detail = !hasMembership
    ? t("member.home.browsePlansToStart")
    : [
        typeof daysLeft === "number"
          ? t("member.home.daysLeft", { count: Math.max(0, daysLeft) })
          : null,
        typeof visitsLeft === "number" ? t("member.home.visitsLeft", { count: visitsLeft }) : null,
      ]
        .filter(Boolean)
        .join(" · ") || t("member.home.membershipActive");

  return (
    <Card
      semanticSurface={needsAction ? "warningCard" : undefined}
      variant="compact"
      contentStyle={styles.membershipCard}
      pressable={!needsAction}
      onPress={!needsAction ? () => router.push("/membership" as never) : undefined}
      accessibilityLabel={t("member.home.membershipAccessibility", {
        status: statusLabel,
        detail,
        gym: organization?.name ?? t("member.home.gymFallback"),
      })}
    >
      <View style={styles.membershipTop}>
        <IconBubble
          icon={!hasMembership ? "card-outline" : isExpired ? "warning-outline" : "shield-checkmark-outline"}
          tone={needsAction ? "amber" : "lime"}
          size={40}
        />
        <View style={styles.membershipCopy}>
          <Text style={[styles.membershipEyebrow, { color: palette.text.secondary }]}>
            {t("member.home.membershipAccess")}
          </Text>
          <Text style={[styles.membershipTitle, { color: palette.text.primary }]}>
            {statusLabel}
          </Text>
          <Text style={[styles.membershipMeta, { color: palette.text.secondary }]}>
            {detail}
          </Text>
        </View>
        {needsAction ? null : <Ionicons name="chevron-forward" size={20} color={palette.text.tertiary} />}
      </View>
      {needsAction ? (
        <ZookButton
          onPress={() => router.push("/membership" as never)}
          icon="card-outline"
          fullWidth
        >
          {hasMembership ? t("member.home.renewMembership") : t("member.home.getMembership")}
        </ZookButton>
      ) : null}
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const homeQuery = useMemberHome();
  const trackingQuery = useMyTracking();
  const home = homeQuery.data;
  const state = deriveHomeState(home);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || t("more.fallbackName");
  const { activeCheckIn, checkoutBusy, stopActiveCheckIn } = useManualCheckout();
  const scrollY = useSharedValue(0);
  const streakDays = home?.streakDays ?? 0;
  const weeklyVisits = countThisWeek(home?.recentAttendance ?? []);
  // summary.totalDuration is already in minutes (backend sums durationMinutes).
  const activeMinutes = Math.round(trackingQuery.data?.summary.totalDuration ?? 0);
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
            title={t("member.home.greeting", { name: firstName })}
            trailing={<HeaderActions showBell showProfileShortcut={false} showShopShortcut />}
            meta={
              streakDays > 0 ? (
                <HeaderMeta icon="flame" tone="accent">
                  {t("member.home.dayStreak", { count: streakDays })}
                </HeaderMeta>
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
              <AnimatedAppear delay={20}>
                <Banners home={home} />
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
                <ClassesStrip />
              </AnimatedAppear>
              <AnimatedAppear delay={activeCheckIn ? 140 : 100}>
                <CoachingStrip />
              </AnimatedAppear>
              <AnimatedAppear delay={activeCheckIn ? 160 : 120}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("member.home.openProgress")}
                  onPress={() => router.push("/progress" as never)}
                  style={({ pressed }) => (pressed ? styles.statStripPressed : null)}
                >
                  <StatStrip
                    items={[
                      { label: t("member.home.visits"), value: String(weeklyVisits) },
                      { label: t("member.home.active"), value: formatCompactMinutes(activeMinutes) },
                      { label: t("member.home.workouts"), value: String(workoutsLogged) },
                      { label: t("member.home.habits"), value: String(habitsDone) },
                    ]}
                  />
                </Pressable>
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

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
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
    ...typography.cardTitle,
  },
  membershipMeta: {
    ...typography.small,
  },
});
