import type { ComponentProps, ComponentType } from "react";
import { useEffect } from "react";
import { StyleSheet, Text, View, TextInput, type TextInputProps } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withSpring } from "@/lib/reanimated-lite";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { GlassCard, ZookButton } from "@/components/primitives";
import { colors, spacing, typography } from "@/lib/theme";

type AnimatedCircleProps = ComponentProps<typeof Circle> & {
  animatedProps?: Partial<ComponentProps<typeof Circle>>;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle) as ComponentType<AnimatedCircleProps>;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput) as ComponentType<
  TextInputProps & { animatedProps?: Record<string, unknown> }
>;

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
  expired,
  planName,
  progressValue,
  visitProgressLabel,
  renewalDate,
  showActions = true,
  showBillingAction,
  streakDays,
  visitLabel,
}: {
  daysLeftLabel: string;
  expired: boolean;
  planName: string;
  progressValue: number;
  visitProgressLabel?: string;
  renewalDate?: string | null;
  showActions?: boolean;
  showBillingAction: boolean;
  streakDays: number;
  visitLabel: string;
}) {
  const mainLabel = expired ? "Membership needs renewal" : daysLeftLabel;
  const splitLabel = mainLabel.match(/^(\d+)\s+(.+)$/);
  const visitCount = visitLabel.match(/^(\d+)/)?.[1] ?? "-";
  const progress = Math.max(0, Math.min(1, progressValue));
  const progressPct = `${Math.round(progress * 100)}%`;
  const ringSize = 104;
  const strokeWidth = 9;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringProgress = useSharedValue(0);
  const animatedRingProps = useAnimatedProps(() => ({
    strokeDasharray: `${circumference * ringProgress.value} ${circumference}`,
  }));
  const encouragement = getMemberEncouragement(streakDays, expired);

  const numericVisitCount = parseInt(visitCount, 10);
  const animatedVisitCount = useSharedValue(0);

  useEffect(() => {
    ringProgress.value = withSpring(progress, { mass: 1, damping: 15, stiffness: 100 });
    if (!isNaN(numericVisitCount)) {
      animatedVisitCount.value = withSpring(numericVisitCount, { mass: 1, damping: 15, stiffness: 100 });
    }
  }, [progress, ringProgress, numericVisitCount, animatedVisitCount]);

  const animatedVisitProps = useAnimatedProps(() => {
    return {
      text: isNaN(numericVisitCount) ? visitCount : `${Math.round(animatedVisitCount.value)}`,
    } as any;
  });

  return (
    <GlassCard
      variant={expired ? "warning" : "selected"}
      glow={!expired}
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
          <Text numberOfLines={1} style={styles.premiumPlanName}>
            {planName}
          </Text>
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
                {mainLabel}
              </Text>
            )}
          </View>
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
            <AnimatedCircle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={expired ? colors.amber : colors.lime}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              animatedProps={animatedRingProps}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              opacity={expired ? 0.65 : 1}
            />
          </Svg>
          <View style={styles.visitRingArc}>
            <AnimatedTextInput
              underlineColorAndroid="transparent"
              editable={false}
              animatedProps={animatedVisitProps}
              style={[styles.visitRingValue, { padding: 0, margin: 0 }]}
            />
            <Text style={styles.visitRingLabel}>visits</Text>
            <Text style={styles.visitRingLabel}>remaining</Text>
          </View>
          <Text style={styles.visitRingProgress}>{progressPct}</Text>
          {visitProgressLabel ? (
            <Text numberOfLines={1} style={styles.visitRingMeta}>
              {visitProgressLabel}
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
            <ZookButton href="/membership" icon="refresh-outline" style={styles.heroPrimaryAction}>
              Renew
            </ZookButton>
          ) : (
            <ZookButton href="/scan" icon="qr-code-outline" style={styles.heroPrimaryAction}>
              Scan QR
            </ZookButton>
          )}
          {showBillingAction ? (
            <ZookButton
              href="/tracking-entry"
              tone="secondary"
              icon="play-outline"
              style={styles.heroSecondaryAction}
              accessibilityLabel="Open plan"
            >
              Start Workout
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
