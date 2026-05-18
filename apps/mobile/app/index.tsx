import { Stack } from "expo-router";
import type { Href } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet } from "react-native";
import { resolvePlanName } from "@zook/ui";
import {
  AnimatedAppear,
  BottomNav,
  ErrorState,
  GlassCard,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  ActivityCard,
  FirstRunCard,
  HomeHeader,
  HomeSkeleton,
  MemberStateHero,
  ProfileReadyPrompt,
  ReferralCard,
  TodayPlanCard,
  WorkoutLogCard,
} from "@/components/home";
import { toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAppFocusInvalidation } from "@/lib/app-focus";
import { syncSmartCheckInReminder } from "@/lib/check-in-reminders";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { useMemberDashboard } from "@/lib/query-hooks";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";

function normalizeMediaUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : toWebUrl(trimmed);
}

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { activeOrgId, session } = useAuth();
  const dashboardQuery = useMemberDashboard();
  useAppFocusInvalidation([
    ["me", "dashboard"],
    ["me", "home"],
    ["me", "engagement"],
    ["me", "membership"],
    ["me", "notifications"],
  ]);
  const memberHome = dashboardQuery.data?.home;
  const engagement = dashboardQuery.data?.engagement;
  const referral = dashboardQuery.data?.referral;
  const notificationPreferences = useMemo(
    () => mergeNotificationPreferences(dashboardQuery.data?.preferences, activeOrgId),
    [activeOrgId, dashboardQuery.data?.preferences],
  );
  const sessionOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const activeOrganization = memberHome?.activeOrganization ?? sessionOrganization;
  const memberName = session?.user.name || "Member";
  const firstName = memberName.trim().split(/\s+/)[0] || "Member";
  const profilePhotoUrl = normalizeMediaUrl(session?.user.profilePhotoUrl);
  const orgName = activeOrganization?.name ?? "Find a gym";
  const city = activeOrganization?.city ?? "Nearby";
  const gymHref = sessionOrganization?.username
    ? (`/gym/${sessionOrganization.username}` as Href)
    : ("/find-gyms" as Href);
  const daysLeft = memberHome?.activeMembership?.daysLeft;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits;
  const visitLimit = memberHome?.activePlan?.visitLimit;
  const membershipExpired =
    Boolean(memberHome?.activeMembership) &&
    (String(memberHome?.activeMembership?.status ?? "")
      .toUpperCase()
      .includes("EXPIRED") ||
      (typeof daysLeft === "number" && daysLeft <= 0));
  const daysLeftLabel =
    typeof daysLeft === "number" ? `${daysLeft} days left` : "Membership status pending";
  const remainingVisitsLabel =
    typeof remainingVisits === "number"
      ? `${remainingVisits} visits remaining`
      : "Visit balance pending";
  const unreadCount = memberHome?.unreadNotifications ?? 0;
  const assignedPlan = memberHome?.todayPlanName
    ? {
        name: memberHome.todayPlanName,
        type: "Today",
      }
    : null;
  const lastCheckIn = memberHome?.recentAttendance?.[0]?.checkedInAt
    ? new Date(memberHome.recentAttendance[0].checkedInAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "None";
  const streakDays = engagement?.streakDays ?? memberHome?.streakDays ?? 0;
  const latestBadge = engagement?.latestBadge ?? engagement?.badges?.[0] ?? null;
  const nextMilestone = engagement?.nextMilestone ?? null;
  const hasGym = Boolean(activeOrganization);
  const hasMembership = Boolean(memberHome?.activeMembership);
  const profileNeedsWork = Boolean(hasMembership && (!profilePhotoUrl || !session?.user.phone));
  const neverCheckedIn = hasMembership && (memberHome?.recentAttendance?.length ?? 0) === 0;
  const renewalImminent =
    hasMembership && (membershipExpired || (typeof daysLeft === "number" && daysLeft <= 7));
  const loadingHome = dashboardQuery.isLoading && !memberHome;
  const homeError = dashboardQuery.isError && !memberHome;
  const firstRunState =
    loadingHome || homeError
      ? null
      : !hasGym
        ? "NO_GYM"
        : !hasMembership
          ? "NO_MEMBERSHIP"
          : neverCheckedIn
            ? "NEVER_CHECKED_IN"
        : null;
  const contentPaddingBottom = useBottomScrollPadding({ hasStickyAction: renewalImminent });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "engagement"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "badges"] }),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const streak = streakDays;
    if (!activeOrgId || ![7, 30, 100].includes(streak)) {
      return;
    }
    const key = `zook_streak_milestone_${activeOrgId}_${streak}`;
    void getStoredValue(key).then((stored) => {
      if (stored) return;
      void setStoredValue(key, "1");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        tone: "success",
        haptic: "success",
        title: `${streak}-day streak`,
        message: "Nice consistency. Keep it going.",
      });
    });
  }, [activeOrgId, streakDays]);

  useEffect(() => {
    if (!hasMembership || !memberHome) {
      return;
    }
    void syncSmartCheckInReminder({
      enabled: notificationPreferences.engagement && notificationPreferences.pushEnabled,
      gymName: activeOrganization?.name,
      recentAttendance: memberHome.recentAttendance,
    });
  }, [
    activeOrganization?.name,
    hasMembership,
    memberHome,
    notificationPreferences.engagement,
    notificationPreferences.pushEnabled,
  ]);

  async function shareReferral() {
    const code = referral?.referralCodes[0]?.code;
    if (!code) return;
    const webPath =
      referral?.links?.web ??
      (sessionOrganization?.username ? `/join/${sessionOrganization.username}?ref=${code}` : "/");
    await Share.share({
      message: `Join my gym on Zook with referral code ${code}: ${toWebUrl(webPath)}`,
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: contentPaddingBottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <HomeHeader
            firstName={firstName}
            gymHref={gymHref}
            orgName={orgName}
            city={city}
            unreadCount={unreadCount}
          />

          {homeError ? (
            <GlassCard variant="danger" contentStyle={styles.stateCardContent}>
              <ErrorState
                title="Home could not load"
                body="We could not refresh your membership, check-ins, or notifications. Your data may still be fine, but this screen needs a retry."
                action={
                  <ZookButton
                    onPress={() => void dashboardQuery.refetch()}
                    tone="secondary"
                    icon="refresh-outline"
                  >
                    Try again
                  </ZookButton>
                }
              />
            </GlassCard>
          ) : null}

          {loadingHome ? <HomeSkeleton /> : null}

          {firstRunState ? (
            <AnimatedAppear>
              <FirstRunCard state={firstRunState} gymUsername={sessionOrganization?.username} />
            </AnimatedAppear>
          ) : null}

          {profileNeedsWork ? (
            <AnimatedAppear delay={60}>
              <ProfileReadyPrompt needsPhoto={!profilePhotoUrl} />
            </AnimatedAppear>
          ) : null}

          {hasMembership ? (
            <>
              <AnimatedAppear delay={40}>
              <MemberStateHero
                expired={membershipExpired}
                daysLeftLabel={daysLeftLabel}
                planName={resolvePlanName(memberHome?.activePlan) ?? "Membership"}
                streakDays={streakDays}
                visitLabel={remainingVisitsLabel}
                renewalDate={memberHome?.activeMembership?.endsAt}
                progressValue={
                  typeof remainingVisits === "number" && typeof visitLimit === "number" && visitLimit > 0
                    ? Math.max(0, Math.min(1, (visitLimit - remainingVisits) / visitLimit))
                    : typeof daysLeft === "number" && memberHome?.activePlan?.durationDays
                    ? Math.max(
                        0,
                        Math.min(1, daysLeft / Math.max(memberHome.activePlan.durationDays, 1)),
                      )
                    : 0
                }
                visitProgressLabel={
                  typeof remainingVisits === "number" && typeof visitLimit === "number" && visitLimit > 0
                    ? `${Math.max(0, visitLimit - remainingVisits)} of ${visitLimit} visits used`
                    : undefined
                }
                lastCheckIn={lastCheckIn}
                showActions
                showBillingAction={!renewalImminent}
              />
              </AnimatedAppear>
              <AnimatedAppear delay={120}>
              <TodayPlanCard
                planName={assignedPlan?.name ?? "No plan yet"}
                trainerName={
                  memberHome?.todayPlanTrainer?.name ??
                  memberHome?.assignedTrainer?.name ??
                  "Your trainer"
                }
                assigned={Boolean(assignedPlan)}
              />
              </AnimatedAppear>
              <AnimatedAppear delay={200}>
              <ActivityCard
                streakDays={streakDays}
                lastCheckIn={lastCheckIn}
                totalCheckIns={
                  engagement?.totalCheckIns ?? memberHome?.recentAttendance?.length ?? 0
                }
                latestBadge={latestBadge}
                nextMilestone={nextMilestone}
              />
              </AnimatedAppear>
              <AnimatedAppear delay={280}>
                <WorkoutLogCard />
              </AnimatedAppear>
              {referral?.referralCodes[0] ? (
                <AnimatedAppear delay={340}>
                <ReferralCard
                  code={referral.referralCodes[0].code}
                  redemptions={referral.referralCodes[0].redemptionCount ?? 0}
                  maxUses={referral.referralCodes[0].maxUses ?? null}
                  rewardsCount={referral.rewards?.length ?? 0}
                  onShare={() => void shareReferral()}
                  onCopy={async () => {
                    const code = referral.referralCodes[0]?.code;
                    if (!code) return;
                    try {
                      await Clipboard.setStringAsync(code);
                      showToast({ tone: "success", message: "Referral code copied." });
                    } catch {
                      showToast({ tone: "danger", message: "Could not copy code." });
                    }
                  }}
                />
                </AnimatedAppear>
              ) : null}
            </>
          ) : null}
        </ScrollView>
        {renewalImminent ? (
          <StickyActionBar>
            <ZookButton href="/membership" icon="refresh-outline" fullWidth>
              {membershipExpired ? "Renew now" : "Renew membership"}
            </ZookButton>
          </StickyActionBar>
        ) : null}
        <BottomNav />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  premiumHeader: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: 14,
  },
  premiumGreetingBlock: {
    flex: 1,
    gap: 4,
  },
  premiumGreeting: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  premiumName: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  premiumBell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  premiumGymSelector: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 18,
  },
  premiumGymText: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
  },
  premiumMemberCard: {
    padding: 16,
    gap: 14,
  },
  premiumMemberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  premiumMemberCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  premiumMemberEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  premiumMemberEyebrow: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  premiumPlanName: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
  },
  daysLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  daysLeftText: {
    color: colors.lime,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
  },
  renewalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  renewalText: {
    flex: 1,
    color: colors.muted,
    ...typography.small,
  },
  visitRingOuter: {
    width: 124,
    alignItems: "center",
    gap: 4,
  },
  visitRingSvg: {
    position: "absolute",
    top: 0,
  },
  visitRingArc: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  visitRingValue: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
  },
  visitRingLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 15,
  },
  visitRingProgress: {
    color: colors.subtle,
    fontSize: 10,
    lineHeight: 12,
  },
  visitRingMeta: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    maxWidth: 122,
    textAlign: "center",
  },
  memberEncouragement: {
    minHeight: 45,
    borderTopWidth: 1,
    borderColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memberEncouragementText: {
    color: colors.muted,
    ...typography.small,
  },
  todayPlanContent: {
    padding: 18,
    gap: 12,
  },
  todayPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  todayPlanEyebrow: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 21,
  },
  todayPlanBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  todayPlanCopy: {
    flex: 1,
    gap: 4,
  },
  todayPlanTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontFamily: "Inter_700Bold",
  },
  todayPlanMeta: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  assignedChip: {
    minHeight: 36,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  assignedChipText: {
    color: colors.lime,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold",
  },
  activityContent: {
    padding: 18,
    gap: 18,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activityTitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 21,
  },
  activityStats: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 118,
  },
  activityStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  activityDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  activityStatLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  activityStatValue: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 31,
    fontFamily: "Inter_700Bold",
  },
  activityStatValueSmall: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
  },
  activityStatMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
  },
  homeHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(7,9,8,0.74)",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.13)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  pressedAvatar: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  avatarText: {
    color: colors.lime,
    ...typography.h3,
  },
  headerCopy: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  greeting: {
    color: colors.text,
    ...typography.h3,
  },
  gymLineRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gymLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gymLogoImage: {
    width: "100%",
    height: "100%",
  },
  gymLogoText: {
    color: colors.muted,
    fontSize: 7,
    lineHeight: 9,
    fontFamily: "Inter_700Bold",
  },
  gymLine: {
    flexShrink: 1,
    color: colors.muted,
    ...typography.small,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
  },
  profilePrompt: {
    minHeight: 76,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.28)",
    backgroundColor: "rgba(185,244,85,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  profilePromptIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePromptCopy: {
    flex: 1,
    gap: 2,
  },
  profilePromptTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  profilePromptBody: {
    color: colors.muted,
    ...typography.small,
  },
  memberHeroContent: {
    padding: 18,
    gap: 10,
  },
  heroEyebrow: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  heroNumberRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  heroNumber: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 44,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  heroNumberUrgent: {
    color: colors.amber,
  },
  heroNumberSuffix: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
  },
  heroTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  heroMeta: {
    color: colors.muted,
    ...typography.small,
  },
  heroMeterTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  heroMeterFill: {
    height: "100%",
    borderRadius: 999,
  },
  heroActions: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroPrimaryAction: {
    flex: 1,
  },
  heroSecondaryAction: {
    flex: 0.9,
    paddingHorizontal: 8,
  },
  todayGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  todayTile: {
    flex: 1,
  },
  todayTilePressable: {
    flex: 1,
  },
  tileEyebrow: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  tileTitle: {
    color: colors.text,
    marginTop: 5,
    ...typography.bodyStrong,
  },
  tileMeta: {
    color: colors.muted,
    ...typography.small,
  },
  streakRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginTop: 2,
  },
  streakValue: {
    color: colors.lime,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  engagementContent: {
    gap: 12,
    padding: 14,
  },
  engagementTopRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  engagementStreak: {
    flex: 1,
    minWidth: 0,
  },
  badgePreview: {
    width: 118,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconEmpty: {
    backgroundColor: colors.panel,
  },
  badgeTitle: {
    maxWidth: "100%",
    color: colors.text,
    ...typography.caption,
  },
  engagementProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  engagementProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  secondaryActionContent: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
  },
  referralContent: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
  },
  referralCopy: {
    flex: 1,
    gap: 3,
  },
  referralCode: {
    alignSelf: "flex-start",
    color: colors.lime,
    ...typography.bodyStrong,
  },
  referralShareButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionCopy: {
    flex: 1,
    gap: 2,
  },
  secondaryActionTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  checkInCta: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  checkInCtaText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: "800",
  },
  firstRunContent: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
  },
  firstRunCopy: {
    flex: 1,
    gap: 4,
  },
  stateCardContent: {
    padding: 0,
  },
  skeletonStack: {
    gap: 12,
  },
  skeletonHero: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 14,
  },
  skeletonCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  skeletonMembership: {
    gap: spacing.sm,
    padding: 16,
  },
  firstRunTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  progressSummary: {
    color: colors.muted,
    ...typography.small,
  },
  membershipCopy: {
    flex: 1,
    gap: 8,
  },
  membershipLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mutedSmall: {
    color: colors.muted,
    ...typography.small,
  },
  mutedBody: {
    color: colors.muted,
    ...typography.body,
  },
  membershipTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  membershipTitle: {
    color: colors.text,
    ...typography.h2,
  },
  daysLeft: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  daysLeftUrgent: {
    color: colors.amber,
  },
  renewalAlert: {
    color: colors.amber,
    ...typography.small,
  },
  membershipCta: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  membershipCtaText: {
    color: colors.bg,
    ...typography.caption,
  },
  planCopy: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  trackRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trackCopy: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
});
