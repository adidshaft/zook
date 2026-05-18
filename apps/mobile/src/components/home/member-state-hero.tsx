import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { GlassCard, ZookButton } from "@/components/primitives";
import { colors, spacing, typography } from "@/lib/theme";

function formatRenewalDate(value?: string | null) {
  if (!value) return "Renewal date pending";
  return `Renews ${new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

function getMemberEncouragement(streakDays: number, expired: boolean) {
  if (expired) return "Renew your membership to keep your gym rhythm going.";
  if (streakDays >= 30) return "Thirty days strong. Your consistency is doing the heavy lifting.";
  if (streakDays >= 7) return "One week locked in. Keep the streak alive today.";
  if (streakDays >= 3) return "You are building a real habit. One more session keeps it warm.";
  if (streakDays > 0) return "Nice start. Check in again to grow your streak.";
  return "Check in today and start your streak.";
}

export function MemberStateHero({
  daysLeftLabel,
  durationDays,
  expired,
  lastCheckIn,
  planName,
  progressValue,
  renewalDate,
  showActions = true,
  showBillingAction,
  streakDays,
  visitLabel,
  visitLimit,
}: {
  daysLeftLabel: string;
  durationDays?: number | null;
  expired: boolean;
  lastCheckIn?: string;
  planName: string;
  progressValue: number;
  renewalDate?: string | null;
  showActions?: boolean;
  showBillingAction: boolean;
  streakDays: number;
  visitLabel: string;
  visitLimit?: number | null;
}) {
  const router = useRouter();
  const visitCountMatch = visitLabel.match(/^(\d+)/);
  const dayCountMatch = daysLeftLabel.match(/^(\d+)/);
  const ringValue = visitCountMatch?.[1] ?? dayCountMatch?.[1] ?? "-";
  const ringLabel = visitCountMatch
    ? visitLimit
      ? ([`of ${visitLimit}`, "visits left"] as const)
      : (["visits", "left"] as const)
    : expired
    ? (["renewal", "needed"] as const)
    : durationDays
      ? ([`of ${durationDays}`, "days left"] as const)
      : (["days", "left"] as const);
  // Only show the supplemental status text on the left when the ring is
  // showing visit data — otherwise the ring already conveys "days left"
  // and rendering it again on the left creates a duplicate.
  const showSupplementalDaysLeft = Boolean(visitCountMatch) || expired;
  const supplementalLabel = expired ? "Membership needs renewal" : daysLeftLabel;
  const splitLabel = supplementalLabel.match(/^(\d+)\s+(.+)$/);
  const progress = Math.max(0, Math.min(1, progressValue));
  const ringMetaLabel = expired && !dayCountMatch && !visitCountMatch ? "Renew to continue" : undefined;
  const ringSize = 104;
  const strokeWidth = 9;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringDashArray = `${circumference * progress} ${circumference}`;
  const baseEncouragement = getMemberEncouragement(streakDays, expired);
  const encouragement = lastCheckIn && lastCheckIn !== "None" && !expired
    ? `${baseEncouragement} · Last check-in ${lastCheckIn}`
    : baseEncouragement;

  return (
    <GlassCard
      variant={expired ? "warning" : "selected"}
      glow={Platform.OS !== "android" && !expired}
      contentStyle={styles.premiumMemberCard}
    >
      <View style={styles.premiumMemberTopRow}>
        <View style={styles.premiumMemberCopy}>
          <View style={styles.premiumMemberEyebrowRow}>
            <Ionicons name="person-outline" size={21} color={colors.lime} />
            <Text style={styles.premiumMemberEyebrow}>
              {expired ? "Renewal needed" : "Active Membership"}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.premiumPlanName}>
            {planName}
          </Text>
          {showSupplementalDaysLeft ? (
            <View style={styles.daysLeftRow}>
              {splitLabel ? (
                <>
                  <Text style={[styles.daysLeftText, expired ? styles.heroNumberUrgent : null]}>
                    {splitLabel[1]} {splitLabel[2]}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={expired ? colors.amber : colors.lime}
                  />
                </>
              ) : (
                <Text style={[styles.daysLeftText, expired ? styles.heroNumberUrgent : null]}>
                  {supplementalLabel}
                </Text>
              )}
            </View>
          ) : null}
          <View style={styles.renewalRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.muted} />
            <Text numberOfLines={1} style={styles.renewalText}>
              {formatRenewalDate(renewalDate)}
            </Text>
          </View>
        </View>
        <View style={styles.visitRingOuter}>
          <Svg width={ringSize} height={ringSize} style={styles.visitRingSvg}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={expired ? colors.amber : colors.lime}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={ringDashArray}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              opacity={expired ? 0.65 : 1}
            />
          </Svg>
          <View style={styles.visitRingArc}>
            <Text style={styles.visitRingValue}>{ringValue}</Text>
            <Text style={styles.visitRingLabel}>{ringLabel[0]}</Text>
            <Text style={styles.visitRingLabel}>{ringLabel[1]}</Text>
          </View>
          {ringMetaLabel ? (
            <Text numberOfLines={1} style={styles.visitRingMeta}>
              {ringMetaLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.memberEncouragement}>
        <Ionicons name="star-outline" size={17} color={colors.lime} />
        <Text style={styles.memberEncouragementText}>{encouragement}</Text>
      </View>
      {showActions ? (
        <View style={styles.heroActions}>
          {expired ? (
            <ZookButton
              onPress={() => router.push("/membership")}
              icon="refresh-outline"
              style={styles.heroPrimaryAction}
            >
              Renew
            </ZookButton>
          ) : (
            // Scan QR is permanently available via the floating bottom-nav
            // FAB — repeating it on the hero created a visible duplicate
            // action. Start Workout is the better contextual primary here.
            <ZookButton
              onPress={() => router.push("/tracking-entry")}
              icon="play-outline"
              style={styles.heroPrimaryAction}
            >
              Start Workout
            </ZookButton>
          )}
          {showBillingAction && !expired ? (
            <ZookButton
              onPress={() => router.push("/membership")}
              tone="secondary"
              icon="card-outline"
              style={styles.heroSecondaryAction}
              accessibilityLabel="View membership"
            >
              Membership
            </ZookButton>
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 20,
    lineHeight: 25,
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
  heroNumberUrgent: {
    color: colors.amber,
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
    minHeight: 124,
    alignItems: "center",
    gap: 4,
  },
  visitRingSvg: {
    position: "absolute",
    top: 0,
    left: 10,
    backgroundColor: "transparent",
  },
  visitRingArc: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
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
});
