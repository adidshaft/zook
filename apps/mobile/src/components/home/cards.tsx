import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GlassCard,
  IconBubble,
  Skeleton,
} from "@/components/primitives";
import type { MemberBadgeRecord, MemberNextMilestone } from "@/lib/query-hooks";
import { colors, spacing, typography } from "@/lib/theme";

export function ReferralCard({
  code,
  maxUses,
  onShare,
  onCopy,
  redemptions,
  rewardsCount,
}: {
  code: string;
  maxUses?: number | null;
  onShare: () => void;
  onCopy?: () => void;
  redemptions: number;
  rewardsCount: number;
}) {
  return (
    <GlassCard variant="compact" contentStyle={styles.referralContent}>
      <IconBubble icon="gift-outline" tone="amber" size={38} />
      <View style={styles.referralCopy}>
        <Text style={styles.secondaryActionTitle}>Refer a friend</Text>
        <Text numberOfLines={1} style={styles.mutedSmall}>
          {redemptions}/{maxUses ?? "unlimited"} used · {rewardsCount} reward
          {rewardsCount === 1 ? "" : "s"}
        </Text>
        {onCopy ? (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={`Copy referral code ${code}`}
            hitSlop={6}
          >
            <Text style={styles.referralCode}>{code}</Text>
          </Pressable>
        ) : (
          <Text selectable style={styles.referralCode}>
            {code}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share referral code"
        style={styles.referralShareButton}
      >
        <Ionicons name="share-outline" size={18} color={colors.bg} />
      </Pressable>
    </GlassCard>
  );
}

export function TodayPlanCard({
  assigned,
  planName,
  trainerName,
}: {
  assigned: boolean;
  planName: string;
  trainerName: string;
}) {
  return (
    <Link href="/plans" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Open today's plan">
        <GlassCard variant="compact" contentStyle={styles.todayPlanContent}>
          <View style={styles.todayPlanHeader}>
            <Ionicons name="clipboard-outline" size={22} color={colors.lime} />
            <Text style={styles.todayPlanEyebrow}>Today's Plan</Text>
          </View>
          <View style={styles.todayPlanBody}>
            <View style={styles.todayPlanCopy}>
              <Text numberOfLines={2} style={styles.todayPlanTitle}>
                {planName}
              </Text>
              <View style={styles.todayPlanMetaRow}>
                <Text numberOfLines={1} style={styles.todayPlanMeta}>
                  {assigned ? `6 exercises · ${trainerName}` : "Trainer will assign one"}
                </Text>
                <View style={styles.assignedChip}>
                  <Ionicons
                    name={assigned ? "checkmark-circle-outline" : "time-outline"}
                    size={14}
                    color={colors.lime}
                  />
                  <Text style={styles.assignedChipText}>
                    {assigned ? "Assigned" : "Open"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} />
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function safeIconName(icon?: string | null): keyof typeof Ionicons.glyphMap {
  return icon && icon in Ionicons.glyphMap
    ? (icon as keyof typeof Ionicons.glyphMap)
    : "ribbon-outline";
}

export function ActivityCard({
  latestBadge,
  lastCheckIn,
  nextMilestone,
  streakDays,
  totalCheckIns,
}: {
  latestBadge?: MemberBadgeRecord | null;
  lastCheckIn: string;
  nextMilestone?: MemberNextMilestone | null;
  streakDays: number;
  totalCheckIns: number;
}) {
  const weeklyTarget = nextMilestone?.metric === "totalCheckIns" ? nextMilestone.remaining : 5;
  const weeklyGoalLabel = `${Math.min(totalCheckIns, 5)}/${Math.max(weeklyTarget, 3)}`;
  return (
    <GlassCard variant="compact" contentStyle={styles.activityContent}>
      <View style={styles.activityTitleRow}>
        <Ionicons name="pulse-outline" size={21} color={colors.lime} />
        <Text style={styles.activityTitle}>Activity</Text>
      </View>
      <View style={styles.activityStats}>
        <View style={styles.activityStat}>
          <Ionicons name="flame-outline" size={27} color={colors.lime} />
          <Text style={styles.activityStatLabel}>Streak</Text>
          <Text style={styles.activityStatValue}>{streakDays}</Text>
          <Text style={styles.activityStatMeta}>days</Text>
        </View>
        <View style={styles.activityDivider} />
        <View style={styles.activityStat}>
          <Ionicons name="time-outline" size={27} color={colors.lime} />
          <Text style={styles.activityStatLabel}>Last check-in</Text>
          <Text numberOfLines={1} style={styles.activityStatValueSmall}>
            {lastCheckIn}
          </Text>
          <Text style={styles.activityStatMeta}>{latestBadge?.name ?? "Keep moving"}</Text>
        </View>
        <View style={styles.activityDivider} />
        <View style={styles.activityStat}>
          <Ionicons name={safeIconName(nextMilestone?.icon)} size={27} color={colors.lime} />
          <Text style={styles.activityStatLabel}>Weekly goal</Text>
          <Text style={styles.activityStatValue}>{weeklyGoalLabel}</Text>
          <Text style={styles.activityStatMeta}>check-ins</Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function ProfileReadyPrompt({ needsPhoto }: { needsPhoto: boolean }) {
  return (
    <Link href="/profile" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Complete profile for check-in">
        <View style={styles.profilePrompt}>
          <View style={styles.profilePromptIcon}>
            <Ionicons
              name={needsPhoto ? "camera-outline" : "call-outline"}
              size={18}
              color={colors.bg}
            />
          </View>
          <View style={styles.profilePromptCopy}>
            <Text style={styles.profilePromptTitle}>Finish your check-in profile</Text>
            <Text numberOfLines={2} style={styles.profilePromptBody}>
              {needsPhoto
                ? "Add your photo so reception can verify you at entry."
                : "Add your mobile number so the gym can reach you when needed."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>
    </Link>
  );
}

export function WorkoutLogCard() {
  return (
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
  );
}

export function HomeSkeleton() {
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

export function FirstRunCard({
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
  referralContent: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 16,
  },
  referralCopy: {
    flex: 1,
    gap: 4,
  },
  referralCode: {
    color: colors.lime,
    ...typography.h3,
  },
  referralShareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
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
    minWidth: 0,
    gap: 6,
  },
  todayPlanTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
  },
  todayPlanMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  todayPlanMeta: {
    flex: 1,
    minWidth: 0,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
  },
  assignedChip: {
    minHeight: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(185,244,85,0.14)",
    flexShrink: 0,
  },
  assignedChipText: {
    color: colors.lime,
    fontSize: 12,
    lineHeight: 16,
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
  secondaryActionContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: 16,
  },
  secondaryActionCopy: {
    flex: 1,
    gap: 2,
  },
  secondaryActionTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  mutedSmall: {
    color: colors.muted,
    ...typography.small,
  },
  mutedBody: {
    color: colors.muted,
    ...typography.body,
  },
  skeletonStack: {
    gap: 12,
  },
  skeletonHero: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonMembership: {
    gap: 12,
    padding: 18,
  },
  firstRunContent: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  firstRunCopy: {
    flex: 1,
    gap: 4,
  },
  firstRunTitle: {
    color: colors.text,
    ...typography.h3,
  },
  checkInCta: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.lime,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
  },
  checkInCtaText: {
    color: colors.bg,
    ...typography.caption,
  },
});
