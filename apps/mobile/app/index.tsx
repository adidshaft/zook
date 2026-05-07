import { Link, Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { resolvePlanName } from "@zook/ui";
import {
  BottomNav,
  ErrorState,
  GlassCard,
  IconBubble,
  StickyActionBar,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

function initialsFor(name?: string | null) {
  const cleanName = name?.trim() ?? "";
  return (
    cleanName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || cleanName.charAt(0).toUpperCase() || "?"
  );
}

function greetingForHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatRenewalDate(value?: string | null) {
  if (!value) return "renewal syncing";
  return `Renews ${new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

function normalizeMediaUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : toWebUrl(trimmed);
}

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { activeOrgId, session } = useAuth();
  const homeQuery = useMemberHome();
  const memberHome = homeQuery.data;
  const sessionOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const activeOrganization = memberHome?.activeOrganization ?? sessionOrganization;
  const memberName = session?.user.name || "Member";
  const firstName = memberName.split(" ")[0] || "Hey";
  const initials = initialsFor(memberName);
  const profilePhotoUrl = normalizeMediaUrl(session?.user.profilePhotoUrl);
  const orgName = activeOrganization?.name ?? "Find a gym";
  const city = activeOrganization?.city ?? "Nearby";
  const gymLogoUrl = normalizeMediaUrl(
    activeOrganization && "logoUrl" in activeOrganization ? activeOrganization.logoUrl : null,
  );
  const gymHref = sessionOrganization?.username
    ? (`/gym/${sessionOrganization.username}` as Href)
    : ("/find-gyms" as Href);
  const daysLeft = memberHome?.activeMembership?.daysLeft;
  const remainingVisits = memberHome?.activeMembership?.remainingVisits;
  const membershipExpired =
    Boolean(memberHome?.activeMembership) &&
    (String(memberHome?.activeMembership?.status ?? "")
      .toUpperCase()
      .includes("EXPIRED") ||
      (typeof daysLeft === "number" && daysLeft <= 0));
  const daysLeftLabel =
    typeof daysLeft === "number" ? `${daysLeft} days left` : "Membership syncing";
  const remainingVisitsLabel =
    typeof remainingVisits === "number" ? `${remainingVisits} visits remaining` : "Visits syncing";
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
  const hasGym = Boolean(activeOrganization);
  const hasMembership = Boolean(memberHome?.activeMembership);
  const neverCheckedIn = hasMembership && (memberHome?.recentAttendance?.length ?? 0) === 0;
  const renewalImminent =
    hasMembership &&
    (membershipExpired || (typeof daysLeft === "number" && daysLeft <= 7));
  const loadingHome = homeQuery.isLoading && !memberHome;
  const homeError = homeQuery.isError && !memberHome;
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

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["me", "home"] });
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            renewalImminent ? styles.contentWithRenewalBar : null,
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
          <BlurView intensity={24} tint="dark" style={styles.homeHeader}>
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => (pressed ? styles.pressedAvatar : null)}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={12}
            >
              <View style={styles.avatar}>
                {profilePhotoUrl ? (
                  <Image
                    source={{ uri: profilePhotoUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </Pressable>
            <Link href={gymHref} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open gym details"
                style={styles.headerCopy}
              >
                <Text numberOfLines={1} style={styles.greeting}>
                  {greetingForHour()}, {firstName}
                </Text>
                <View style={styles.gymLineRow}>
                  <View style={styles.gymLogo}>
                    {gymLogoUrl ? (
                      <Image
                        source={{ uri: gymLogoUrl }}
                        style={styles.gymLogoImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.gymLogoText}>{initialsFor(orgName)}</Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.gymLine}>
                    {orgName}, {city}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.muted} />
                </View>
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <Ionicons name="notifications-outline" size={21} color={colors.text} />
                {unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </Link>
          </BlurView>

          {homeError ? (
            <GlassCard variant="danger" contentStyle={styles.stateCardContent}>
              <ErrorState
                title="Home could not load"
                body="We could not refresh your membership, check-ins, or notifications. Your data may still be fine, but this screen needs a retry."
                action={
                  <ZookButton
                    onPress={() => void homeQuery.refetch()}
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
            <FirstRunCard state={firstRunState} gymUsername={sessionOrganization?.username} />
          ) : null}

          {hasMembership ? (
            <>
              <MemberStateHero
                expired={membershipExpired}
                daysLeftLabel={daysLeftLabel}
                planName={resolvePlanName(memberHome?.activePlan) ?? "Membership"}
                visitLabel={remainingVisitsLabel}
                renewalDate={memberHome?.activeMembership?.endsAt}
                progressValue={
                  typeof daysLeft === "number" && memberHome?.activePlan?.durationDays
                    ? Math.max(
                        0.08,
                        Math.min(
                          1,
                          daysLeft / Math.max(memberHome.activePlan.durationDays, 1),
                        ),
                      )
                    : 0.72
                }
              />
              <View style={styles.todayGrid}>
                <Link href="/plans" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open today's plan"
                    style={styles.todayTilePressable}
                  >
                    <GlassCard variant="compact" style={styles.todayTile}>
                      <Text style={styles.tileEyebrow}>Today</Text>
                      <Text numberOfLines={1} style={styles.tileTitle}>
                        {assignedPlan?.name ?? "No plan yet"}
                      </Text>
                      <Text numberOfLines={1} style={styles.tileMeta}>
                        {assignedPlan ? "Workout plan" : "Trainer will assign one"}
                      </Text>
                    </GlassCard>
                  </Pressable>
                </Link>
                <GlassCard variant="compact" style={styles.todayTile}>
                  <Text style={styles.tileEyebrow}>Streak</Text>
                  <View style={styles.streakRow}>
                    <Text style={styles.streakValue}>{memberHome?.streakDays ?? 0}</Text>
                    <Ionicons name="flame-outline" size={16} color={colors.lime} />
                    <Text style={styles.tileMeta}>days</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.tileMeta}>
                    Last visit {lastCheckIn}
                  </Text>
                </GlassCard>
              </View>
              <Link href="/tracking-entry" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Log today's workout">
                  <GlassCard contentStyle={styles.secondaryActionContent}>
                    <IconBubble icon="pulse-outline" tone="neutral" size={38} />
                    <View style={styles.secondaryActionCopy}>
                      <Text style={styles.secondaryActionTitle}>Log today's workout</Text>
                      <Text numberOfLines={1} style={styles.mutedSmall}>
                        Track sets, reps, and weights.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </GlassCard>
                </Pressable>
              </Link>
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
        {!renewalImminent ? <BottomNav /> : null}
      </ZookScreen>
    </>
  );
}

function MemberStateHero({
  daysLeftLabel,
  expired,
  planName,
  progressValue,
  renewalDate,
  visitLabel,
}: {
  daysLeftLabel: string;
  expired: boolean;
  planName: string;
  progressValue: number;
  renewalDate?: string | null;
  visitLabel: string;
}) {
  const boundedProgress =
    `${Math.round(Math.max(0.06, Math.min(1, progressValue)) * 100)}%` as const;
  const mainLabel = expired ? "Membership needs renewal" : daysLeftLabel;
  const splitLabel = mainLabel.match(/^(\d+)\s+(.+)$/);

  return (
    <GlassCard
      variant={expired ? "warning" : "selected"}
      glow={!expired}
      contentStyle={styles.memberHeroContent}
    >
      <Text style={styles.heroEyebrow}>
        {expired ? "Renewal needed" : "Active membership"}
      </Text>
      <View style={styles.heroNumberRow}>
        {splitLabel ? (
          <>
            <Text style={[styles.heroNumber, expired ? styles.heroNumberUrgent : null]}>
              {splitLabel[1]}
            </Text>
            <Text style={styles.heroNumberSuffix}>{splitLabel[2]}</Text>
          </>
        ) : (
          <Text style={[styles.heroTitle, expired ? styles.heroNumberUrgent : null]}>
            {mainLabel}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.heroMeta}>
        {planName} · {visitLabel} · {formatRenewalDate(renewalDate)}
      </Text>
      <View style={styles.heroMeterTrack}>
        <View
          style={[
            styles.heroMeterFill,
            { width: boundedProgress, backgroundColor: expired ? colors.amber : colors.lime },
          ]}
        />
      </View>
      <View style={styles.heroActions}>
        <ZookButton href="/scan" icon="qr-code-outline" style={styles.heroPrimaryAction}>
          Check in
        </ZookButton>
        <ZookButton
          href="/membership"
          tone="secondary"
          icon="card-outline"
          style={styles.heroSecondaryAction}
          accessibilityLabel={expired ? "Renew membership" : "Open membership"}
        >
          {expired ? "Renew" : "Pay"}
        </ZookButton>
      </View>
    </GlassCard>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <GlassCard variant="compact" contentStyle={styles.skeletonHero}>
        <Skeleton width={46} height={46} borderRadius={23} />
        <View style={styles.skeletonCopy}>
          <Skeleton width="58%" height={18} borderRadius={9} />
          <Skeleton width="82%" height={13} borderRadius={7} />
        </View>
        <Skeleton width={58} height={34} borderRadius={17} />
      </GlassCard>
      <GlassCard variant="compact" contentStyle={styles.skeletonMembership}>
        <Skeleton width="45%" height={14} borderRadius={7} />
        <Skeleton width="72%" height={24} borderRadius={12} />
        <Skeleton width="36%" height={14} borderRadius={7} />
      </GlassCard>
      <GlassCard variant="compact" contentStyle={styles.skeletonMembership}>
        <Skeleton width="34%" height={14} borderRadius={7} />
        <Skeleton width="86%" height={18} borderRadius={9} />
        <Skeleton width="66%" height={14} borderRadius={7} />
      </GlassCard>
    </View>
  );
}

function FirstRunCard({
  state,
  gymUsername,
}: {
  state: "NO_GYM" | "NO_MEMBERSHIP" | "NEVER_CHECKED_IN";
  gymUsername?: string | null;
}) {
  const copy = {
    NO_GYM: {
      icon: "search-outline" as const,
      title: "No gym yet",
      body: "Browse gyms and join one to get started.",
      cta: "Find gyms",
      href: "/find-gyms" as Href,
    },
    NO_MEMBERSHIP: {
      icon: "card-outline" as const,
      title: "No active membership",
      body: "Choose a plan and activate your membership.",
      cta: "View plans",
      href: (gymUsername ? `/gym/${gymUsername}` : "/membership") as Href,
    },
    NEVER_CHECKED_IN: {
      icon: "qr-code-outline" as const,
      title: "Ready to check in?",
      body: "Scan the gym QR to start your first session.",
      cta: "Open scanner",
      href: "/scan" as Href,
    },
  }[state];

  return (
    <Link href={copy.href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={copy.cta}>
        <GlassCard variant="compact" contentStyle={styles.firstRunContent}>
          <IconBubble icon={copy.icon} tone="lime" size={46} />
          <View style={styles.firstRunCopy}>
            <Text style={styles.firstRunTitle}>{copy.title}</Text>
            <Text style={styles.mutedBody}>{copy.body}</Text>
          </View>
          <View style={styles.checkInCta}>
            <Text style={styles.checkInCtaText}>{copy.cta}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.bg} />
          </View>
        </GlassCard>
      </Pressable>
    </Link>
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
  contentWithRenewalBar: {
    paddingBottom: layout.bottomNavContentPadding + layout.stickyActionHeight,
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
    width: 74,
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
  secondaryActionContent: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 12,
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
