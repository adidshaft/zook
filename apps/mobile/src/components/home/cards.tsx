import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GlassCard,
  IconBubble,
  Skeleton,
} from "@/components/primitives";
import type { MemberBadgeRecord, MemberNextMilestone } from "@/lib/domains";
import { spacing, typography, useTheme } from "@/lib/theme";

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
  const { palette } = useTheme();
  return (
    <GlassCard variant="compact" contentStyle={styles.referralContent}>
      <IconBubble icon="gift-outline" tone="amber" size={38} />
      <View style={styles.referralCopy}>
        <Text style={[styles.secondaryActionTitle, { color: palette.text.primary }]}>Refer a friend</Text>
        <Text numberOfLines={1} style={[styles.mutedSmall, { color: palette.text.secondary }]}>
          {redemptions}/{maxUses ?? "unlimited"} used · {rewardsCount} reward
          {rewardsCount === 1 ? "" : "s"}
        </Text>
        {onCopy ? (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={`Copy referral code ${code}`}
            hitSlop={6}
            style={({ pressed }) => (pressed ? styles.referralCodePressed : null)}
          >
            <Text style={[styles.referralCode, { color: palette.accent.base }]}>{code}</Text>
          </Pressable>
        ) : (
          <Text selectable style={[styles.referralCode, { color: palette.accent.base }]}>
            {code}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share referral code"
        style={({ pressed }) => [
          styles.referralShareButton,
          { backgroundColor: palette.accent.fill },
          pressed ? styles.referralShareButtonPressed : null,
        ]}
      >
        <Ionicons name="share-outline" size={18} color={palette.text.onAccent} />
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
  const { palette } = useTheme();
  return (
    <Link href="/plan" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Open today's plan"
        style={({ pressed }) => (pressed ? styles.cardPressed : null)}
      >
        <GlassCard variant="compact" contentStyle={styles.todayPlanContent}>
          <View style={styles.todayPlanHeader}>
            <Ionicons name="clipboard-outline" size={22} color={palette.accent.base} />
            <Text style={[styles.todayPlanEyebrow, { color: palette.text.secondary }]}>Today's Plan</Text>
          </View>
          <View style={styles.todayPlanBody}>
            <View style={styles.todayPlanCopy}>
              <Text numberOfLines={2} style={[styles.todayPlanTitle, { color: palette.text.primary }]}>
                {planName}
              </Text>
              <View style={styles.todayPlanMetaRow}>
                <Text numberOfLines={1} style={[styles.todayPlanMeta, { color: palette.text.secondary }]}>
                  {assigned ? `6 exercises · ${trainerName}` : "Trainer will assign one"}
                </Text>
                <View style={[styles.assignedChip, { backgroundColor: palette.surface.accentSoft }]}>
                  <Ionicons
                    name={assigned ? "checkmark-circle-outline" : "time-outline"}
                    size={14}
                    color={palette.accent.base}
                  />
                  <Text style={[styles.assignedChipText, { color: palette.accent.base }]}>
                    {assigned ? "Assigned" : "Open"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={palette.text.tertiary} />
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
  const { palette } = useTheme();
  const weeklyTarget = nextMilestone?.metric === "totalCheckIns" ? nextMilestone.remaining : 5;
  const weeklyGoalLabel = `${Math.min(totalCheckIns, 5)}/${Math.max(weeklyTarget, 3)}`;
  return (
    <GlassCard variant="compact" contentStyle={styles.activityContent}>
      <View style={styles.activityTitleRow}>
        <Ionicons name="pulse-outline" size={21} color={palette.accent.base} />
        <Text style={[styles.activityTitle, { color: palette.text.secondary }]}>Activity</Text>
      </View>
      <View style={styles.activityStats}>
        <View style={styles.activityStat}>
          <Ionicons name="flame-outline" size={27} color={palette.accent.base} />
          <Text style={[styles.activityStatLabel, { color: palette.text.secondary }]}>Streak</Text>
          <Text style={[styles.activityStatValue, { color: palette.text.primary }]}>{streakDays}</Text>
          <Text style={[styles.activityStatMeta, { color: palette.text.secondary }]}>days</Text>
        </View>
        <View style={[styles.activityDivider, { backgroundColor: palette.border.subtle }]} />
        <View style={styles.activityStat}>
          <Ionicons name="time-outline" size={27} color={palette.accent.base} />
          <Text style={[styles.activityStatLabel, { color: palette.text.secondary }]}>Last check-in</Text>
          <Text numberOfLines={1} style={[styles.activityStatValueSmall, { color: palette.text.primary }]}>
            {lastCheckIn}
          </Text>
          <Text style={[styles.activityStatMeta, { color: palette.text.secondary }]}>
            {latestBadge?.name ?? "Keep moving"}
          </Text>
        </View>
        <View style={[styles.activityDivider, { backgroundColor: palette.border.subtle }]} />
        <View style={styles.activityStat}>
          <Ionicons name={safeIconName(nextMilestone?.icon)} size={27} color={palette.accent.base} />
          <Text style={[styles.activityStatLabel, { color: palette.text.secondary }]}>Weekly goal</Text>
          <Text style={[styles.activityStatValue, { color: palette.text.primary }]}>{weeklyGoalLabel}</Text>
          <Text style={[styles.activityStatMeta, { color: palette.text.secondary }]}>check-ins</Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function ProfileReadyPrompt({ needsPhoto }: { needsPhoto: boolean }) {
  const { palette } = useTheme();
  return (
    <Link href="/profile" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Complete profile for check-in"
        style={({ pressed }) => (pressed ? styles.cardPressed : null)}
      >
        <View
          style={[
            styles.profilePrompt,
            {
              borderColor: palette.border.focus,
              backgroundColor: palette.surface.accentSoft,
            },
          ]}
        >
          <View style={[styles.profilePromptIcon, { backgroundColor: palette.accent.fill }]}>
            <Ionicons
              name={needsPhoto ? "camera-outline" : "call-outline"}
              size={18}
              color={palette.text.onAccent}
            />
          </View>
          <View style={styles.profilePromptCopy}>
            <Text style={[styles.profilePromptTitle, { color: palette.text.primary }]}>Finish your check-in profile</Text>
            <Text numberOfLines={2} style={[styles.profilePromptBody, { color: palette.text.secondary }]}>
              {needsPhoto
                ? "Add your photo so reception can verify you at entry."
                : "Add your mobile number so the gym can reach you when needed."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
        </View>
      </Pressable>
    </Link>
  );
}

export function WorkoutLogCard() {
  const { palette } = useTheme();
  return (
    <Link href="/plan" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Log today's workout"
        style={({ pressed }) => (pressed ? styles.cardPressed : null)}
      >
        <GlassCard contentStyle={styles.secondaryActionContent}>
          <IconBubble icon="pulse-outline" tone="neutral" size={38} />
          <View style={styles.secondaryActionCopy}>
            <Text style={[styles.secondaryActionTitle, { color: palette.text.primary }]}>Log today's workout</Text>
            <Text numberOfLines={1} style={[styles.mutedSmall, { color: palette.text.secondary }]}>
              Track sets, reps, and weights.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
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
  const { palette } = useTheme();
  const copy = {
    NO_GYM: {
      icon: "search-outline" as const,
      title: "No gym yet",
      body: "Browse gyms and join one to get started.",
      cta: "Find gyms",
      href: "/gyms" as Href,
    },
    NO_MEMBERSHIP: {
      icon: "card-outline" as const,
      title: "No active membership",
      body: "Choose a plan and activate your membership.",
      cta: "View plans",
      href: (gymUsername ? `/gyms/${gymUsername}` : "/membership") as Href,
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
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={copy.cta}
        style={({ pressed }) => (pressed ? styles.cardPressed : null)}
      >
        <GlassCard variant="compact" contentStyle={styles.firstRunContent}>
          <IconBubble icon={copy.icon} tone="lime" size={46} />
          <View style={styles.firstRunCopy}>
            <Text style={[styles.firstRunTitle, { color: palette.text.primary }]}>{copy.title}</Text>
            <Text style={[styles.mutedBody, { color: palette.text.secondary }]}>{copy.body}</Text>
          </View>
          <View style={[styles.checkInCta, { backgroundColor: palette.accent.fill }]}>
            <Text style={[styles.checkInCtaText, { color: palette.text.onAccent }]}>{copy.cta}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.text.onAccent} />
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.992 }],
  },
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
    ...typography.h3,
  },
  referralCodePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  referralShareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  referralShareButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
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
    flexShrink: 0,
  },
  assignedChipText: {
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
  },
  activityStatLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityStatValue: {
    fontSize: 27,
    lineHeight: 31,
    fontFamily: "Inter_700Bold",
  },
  activityStatValueSmall: {
    fontSize: 21,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
  },
  activityStatMeta: {
    fontSize: 12,
    lineHeight: 15,
  },
  profilePrompt: {
    minHeight: 76,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  profilePromptIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePromptCopy: {
    flex: 1,
    gap: 2,
  },
  profilePromptTitle: {
    ...typography.bodyStrong,
  },
  profilePromptBody: {
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
    ...typography.bodyStrong,
  },
  mutedSmall: {
    ...typography.small,
  },
  mutedBody: {
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
    ...typography.h3,
  },
  checkInCta: {
    minHeight: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
  },
  checkInCtaText: {
    ...typography.caption,
  },
});
