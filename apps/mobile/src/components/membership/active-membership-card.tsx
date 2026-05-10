import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerField, GlassCard, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { colors, spacing, typography } from "@/lib/theme";
import { toneForStatus } from "./helpers";
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
                { width: `${Math.max(5, Math.min(100, (daysLeft / 30) * 100))}%` },
                daysLeft <= 7 ? styles.progressFillWarning : null,
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressText, daysLeft <= 7 ? styles.progressTextWarning : null]}>
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
            </Text>
            <Text style={styles.progressTextMuted}>
              {subscription.endsAt ? formatLongDate(subscription.endsAt) : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined ? (
        <View style={styles.membershipMetaLine}>
          <Ionicons name="walk-outline" size={14} color={colors.lime} />
          <Text style={styles.membershipMetaText}>
            {subscription.remainingVisits} visits remaining
          </Text>
        </View>
      ) : null}

      <ZookButton onPress={() => onOpenRenewal(subscription)} icon="refresh-outline">
        Renew or change plan
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
    color: colors.text,
    ...typography.cardTitle,
  },
  featuredOrg: {
    color: colors.muted,
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
    backgroundColor: colors.lime,
  },
  progressFillWarning: {
    backgroundColor: colors.amber,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressText: {
    color: colors.lime,
    ...typography.small,
  },
  progressTextWarning: {
    color: colors.amber,
  },
  progressTextMuted: {
    color: colors.muted,
    ...typography.small,
  },
  membershipMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  membershipMetaText: {
    color: colors.muted,
    ...typography.small,
  },
  pausePicker: {
    marginTop: -spacing.xs,
  },
  statusMessage: {
    color: colors.lime,
    ...typography.small,
  },
});
