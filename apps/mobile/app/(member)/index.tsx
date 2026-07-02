import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  Card,
  AnimatedAppear,
  HeaderActions,
  HeaderMeta,
  IconBubble,
  QueryErrorState,
  ScreenHeader,
  SegmentedControl,
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
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

type HomeSection = "classes" | "coaching" | "week";

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
    <Card variant="compact" contentStyle={styles.activeSessionCard}>
      <View style={styles.activeSessionHeader}>
        <IconBubble icon="time-outline" tone="blue" size={34} />
        <View style={styles.activeSessionCopy}>
          <Text numberOfLines={1} style={[styles.activeSessionBranch, { color: palette.text.primary }]}>
            {activeCheckIn.branchName ?? t("member.home.currentBranch")}
          </Text>
          <Text numberOfLines={1} style={[styles.activeSessionLabel, { color: palette.text.secondary }]}>
            {t("member.home.activeCheckIn")}
          </Text>
        </View>
        <Text style={[styles.activeSessionTimer, { color: palette.accent.base }]}>
          {formatElapsedTimer(elapsedSeconds)}
        </Text>
      </View>
      <ZookButton onPress={onStop} disabled={busy} icon="stop-circle-outline" variant="secondary" size="sm">
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
  const gymName = organization?.name?.trim();
  const daysLeft = membership?.daysLeft;
  const visitsLeft = membership?.remainingVisits;
  const hasMembership = Boolean(membership);
  const isExpired =
    hasMembership &&
    (String(membership?.status ?? "")
      .toLowerCase()
      .includes("expired") ||
      (typeof daysLeft === "number" && daysLeft <= 0));
  const isRenewalWindow = hasMembership && typeof daysLeft === "number" && daysLeft <= 7;
  const needsAction = !hasMembership || isExpired || isRenewalWindow;
  const statusLabel = !hasMembership
    ? t("member.home.noActiveMembership")
    : isExpired
      ? t("member.home.renewalNeeded")
      : isRenewalWindow
        ? daysLeft <= 0
          ? t("member.home.membershipEndsToday")
          : t("member.home.daysLeft", { count: Math.max(0, daysLeft) })
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
  const title = gymName || statusLabel;
  const eyebrow = statusLabel;

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
          icon={
            !hasMembership
              ? "card-outline"
              : isExpired
                ? "warning-outline"
                : "shield-checkmark-outline"
          }
          tone={needsAction ? "amber" : "lime"}
          size={40}
        />
        <View style={styles.membershipCopy}>
          <Text numberOfLines={1} style={[styles.membershipEyebrow, { color: palette.text.secondary }]}>
            {eyebrow}
          </Text>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
            style={[styles.membershipTitle, { color: palette.text.primary }]}
          >
            {title}
          </Text>
          <Text numberOfLines={2} style={[styles.membershipMeta, { color: palette.text.secondary }]}>{detail}</Text>
        </View>
        {needsAction ? null : (
          <Ionicons name="chevron-forward" size={20} color={palette.text.tertiary} />
        )}
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
  const [homeSection, setHomeSection] = useState<HomeSection>("classes");
  const sectionDelay = activeCheckIn ? 120 : 80;
  const bottomPadding = useBottomScrollPadding();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
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
              {/* Suppress the compact membership card when renderHomeCard already owns membership messaging */}
              {state.kind !== "noOrg" &&
              state.kind !== "expiredMembership" &&
              state.kind !== "membershipBlocked" &&
              state.kind !== "membershipPendingActivation" &&
              state.kind !== "noPlan" ? (
                <AnimatedAppear delay={0}>
                  <MembershipAccessCard home={home} />
                </AnimatedAppear>
              ) : null}
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
              <AnimatedAppear delay={activeCheckIn ? 80 : 40}>
                {renderHomeCard(state)}
              </AnimatedAppear>
              <AnimatedAppear delay={sectionDelay}>
                <View style={styles.homeSections}>
                  <SegmentedControl<HomeSection>
                    value={homeSection}
                    onChange={setHomeSection}
                    options={[
                      { label: t("member.home.classesTab"), value: "classes" },
                      { label: t("member.home.coachingTab"), value: "coaching" },
                      { label: t("member.home.weekTab"), value: "week" },
                    ]}
                  />
                  {homeSection === "classes" ? <ClassesStrip compact /> : null}
                  {homeSection === "coaching" ? <CoachingStrip /> : null}
                  {homeSection === "week" ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("member.home.openProgress")}
                      onPress={() => router.push("/progress" as never)}
                      style={({ pressed }) => (pressed ? styles.statStripPressed : null)}
                    >
                      <StatStrip
                        items={[
                          { icon: "walk-outline", label: t("member.home.visits"), value: String(weeklyVisits) },
                          {
                            icon: "time-outline",
                            label: t("member.home.active"),
                            value: formatCompactMinutes(activeMinutes),
                          },
                          { icon: "barbell-outline", label: t("member.home.workouts"), value: String(workoutsLogged) },
                          { icon: "checkmark-done-outline", label: t("member.home.habits"), value: String(habitsDone) },
                        ]}
                      />
                    </Pressable>
                  ) : null}
                </View>
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
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  statStripPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  homeSections: {
    gap: spacing.sm,
  },
  activeSessionCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeSessionHeader: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  activeSessionCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  activeSessionLabel: {
    ...typography.navLabel,
  },
  activeSessionBranch: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  activeSessionTimer: {
    ...typography.caption,
    fontFamily: "Inter_800ExtraBold",
    fontVariant: ["tabular-nums"],
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
    fontFamily: "Inter_700Bold",
  },
  membershipTitle: {
    ...typography.cardTitle,
  },
  membershipMeta: {
    ...typography.small,
  },
});
