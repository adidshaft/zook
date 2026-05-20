import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerField, GlassCard, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { legacyColors, spacing, typography } from "@/lib/theme";
import { membershipStatusGuidance, toneForStatus } from "./helpers";
import type { MembershipRecord } from "./types";

export function ActiveMembershipCard({
  activeOrganizationName,
  actionBusy,
  actionStatus,
  daysLeft,
  onOpenRenewal,
  onPauseDateChange,
  onPauseOrResume,
  pauseMinimumDate,
  pauseResumesAt,
  subscription,
}: {
  activeOrganizationName?: string | null;
  actionBusy: boolean;
  actionStatus: string;
  daysLeft: number | null;
  onOpenRenewal: (subscription: MembershipRecord) => void;
  onPauseDateChange: (date: Date) => void;
  onPauseOrResume: (subscription: MembershipRecord) => void;
  pauseMinimumDate: () => Date;
  pauseResumesAt: Date;
  subscription: MembershipRecord;
}) {
  const guidance = membershipStatusGuidance(subscription.status, daysLeft);
  const guidanceTone = toneForStatus(subscription.status);
  const durationDays = subscription.plan?.durationDays ?? subscription.plan?.validityDays ?? null;
  const daysProgress =
    daysLeft !== null && durationDays
      ? Math.max(5, Math.min(100, (daysLeft / Math.max(durationDays, 1)) * 100))
      : daysLeft !== null
        ? Math.max(5, Math.min(100, (daysLeft / 30) * 100))
        : 0;
  const daysLeftLabel =
    daysLeft !== null && durationDays
      ? `${daysLeft} of ${durationDays} days left`
      : daysLeft !== null
        ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
        : "";

  return (
    <GlassCard
      variant={subscription.status === "ACTIVE" ? "success" : "default"}
      contentStyle={styles.featuredContent}
    >
      <View style={styles.featuredHeader}>
        <IconBubble icon="card-outline" tone={toneForStatus(subscription.status)} size={40} />
        <View style={styles.featuredCopy}>
          <Text style={styles.featuredTitle}>{subscription.plan?.name ?? "Membership"}</Text>
          <Text style={styles.featuredOrg}>
            {subscription.organization?.name ?? activeOrganizationName ?? "Gym"}
          </Text>
        </View>
        <Pill tone={toneForStatus(subscription.status)}>
          {titleCaseFromCode(subscription.status ?? "ACTIVE")}
        </Pill>
      </View>

      {daysLeft !== null ? (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${daysProgress}%` },
                daysLeft <= 7 ? styles.progressFillWarning : null,
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressText, daysLeft <= 7 ? styles.progressTextWarning : null]}>
              {daysLeftLabel}
            </Text>
            <Text style={styles.progressTextMuted}>
              {subscription.endsAt ? formatLongDate(subscription.endsAt) : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined ? (
        <View style={styles.membershipMetaLine}>
          <Ionicons name="walk-outline" size={14} color={legacyColors.lime} />
          <Text style={styles.membershipMetaText}>
            {subscription.remainingVisits} visits remaining
          </Text>
        </View>
      ) : null}

      <View style={styles.guidanceCard}>
        <IconBubble icon="information-circle-outline" tone={guidanceTone} size={32} />
        <View style={styles.guidanceCopy}>
          <Text style={styles.guidanceTitle}>{guidance.title}</Text>
          <Text style={styles.guidanceBody}>{guidance.body}</Text>
        </View>
      </View>

      <ZookButton
        testID="membership-renew-button"
        onPress={() => onOpenRenewal(subscription)}
        icon="refresh-outline"
      >
        {guidance.action}
      </ZookButton>
      {subscription.status !== "PAUSED" ? (
        <View style={styles.pausePicker}>
          <DatePickerField
            accessibilityLabel="Membership pause end date"
            label="Pause until"
            value={pauseResumesAt}
            minimumDate={pauseMinimumDate()}
            onChange={onPauseDateChange}
          />
        </View>
      ) : null}
      <ZookButton
        testID="membership-pause-resume-button"
        tone="secondary"
        disabled={actionBusy || (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED")}
        onPress={() => onPauseOrResume(subscription)}
        icon={subscription.status === "PAUSED" ? "play-circle-outline" : "pause-circle-outline"}
      >
        {subscription.status === "PAUSED"
          ? "Resume membership"
          : `Pause until ${pauseResumesAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}`}
      </ZookButton>
      {actionStatus ? <Text style={styles.statusMessage}>{actionStatus}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  featuredContent: {
    gap: spacing.md,
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featuredCopy: {
    flex: 1,
    gap: 3,
  },
  featuredTitle: {
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  featuredOrg: {
    color: legacyColors.muted,
    ...typography.small,
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: legacyColors.lime,
  },
  progressFillWarning: {
    backgroundColor: legacyColors.amber,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressText: {
    color: legacyColors.lime,
    ...typography.small,
  },
  progressTextWarning: {
    color: legacyColors.amber,
  },
  progressTextMuted: {
    color: legacyColors.muted,
    ...typography.small,
  },
  membershipMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  membershipMetaText: {
    color: legacyColors.muted,
    ...typography.small,
  },
  guidanceCard: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: "rgba(0,0,0,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  guidanceCopy: {
    flex: 1,
    gap: 3,
  },
  guidanceTitle: {
    color: legacyColors.text,
    ...typography.bodyStrong,
  },
  guidanceBody: {
    color: legacyColors.muted,
    ...typography.small,
  },
  pausePicker: {
    marginTop: -spacing.xs,
  },
  statusMessage: {
    color: legacyColors.lime,
    ...typography.small,
  },
});
