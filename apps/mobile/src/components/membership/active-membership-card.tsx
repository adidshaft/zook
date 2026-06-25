import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerField, Card, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate, formatVisitLimit, titleCaseFromCode } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
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
  onTerminate,
  pauseMinimumDate,
  pauseResumesAt,
  subscription,
  terminateBusy,
  terminateStatus,
}: {
  activeOrganizationName?: string | null;
  actionBusy: boolean;
  actionStatus: string;
  daysLeft: number | null;
  onOpenRenewal: (subscription: MembershipRecord) => void;
  onPauseDateChange: (date: Date) => void;
  onPauseOrResume: (subscription: MembershipRecord) => void;
  onTerminate?: (subscription: MembershipRecord) => void;
  pauseMinimumDate: () => Date;
  pauseResumesAt: Date;
  subscription: MembershipRecord;
  terminateBusy?: boolean;
  terminateStatus?: string;
}) {
  const { palette } = useTheme();
  const t = useT();
  const guidance = membershipStatusGuidance(subscription.status, daysLeft, t);
  const guidanceTone = toneForStatus(subscription.status);
  const guidanceShowsIcon = guidanceTone === "amber" || guidanceTone === "red";
  const isWarning = daysLeft !== null && daysLeft <= 7;
  const durationDays = subscription.plan?.durationDays ?? subscription.plan?.validityDays ?? null;
  const daysProgress =
    daysLeft !== null && durationDays
      ? Math.max(5, Math.min(100, (daysLeft / Math.max(durationDays, 1)) * 100))
      : daysLeft !== null
        ? Math.max(5, Math.min(100, (daysLeft / 30) * 100))
        : 0;
  const daysLeftLabel =
    daysLeft !== null && durationDays
      ? t("member.membership.daysOfDurationLeft", { daysLeft, durationDays })
      : daysLeft !== null
        ? t("member.home.daysLeft", { count: daysLeft })
        : "";

  return (
    <Card
      variant={subscription.status === "ACTIVE" ? "success" : "default"}
      contentStyle={styles.featuredContent}
    >
      <View style={styles.featuredHeader}>
        <IconBubble icon="card-outline" tone={toneForStatus(subscription.status)} size={40} />
        <View style={styles.featuredCopy}>
          <Text style={[styles.featuredTitle, { color: palette.text.primary }]}>
            {subscription.plan?.name ?? t("member.membership.eyebrow")}
          </Text>
          <Text style={[styles.featuredOrg, { color: palette.text.secondary }]}>
            {subscription.organization?.name ?? activeOrganizationName ?? t("member.home.gymFallback")}
          </Text>
        </View>
        <Pill tone={toneForStatus(subscription.status)}>
          {titleCaseFromCode(subscription.status ?? "ACTIVE")}
        </Pill>
      </View>

      {daysLeft !== null ? (
        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: palette.bg.sunken,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: isWarning ? palette.feedback.warning : palette.accent.base },
                { width: `${daysProgress}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text
              style={[
                styles.progressText,
                { color: isWarning ? palette.feedback.warning : palette.accent.base },
              ]}
            >
              {daysLeftLabel}
            </Text>
            <Text style={[styles.progressTextMuted, { color: palette.text.secondary }]}>
              {subscription.endsAt ? formatLongDate(subscription.endsAt) : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined ? (
        <View style={styles.membershipMetaLine}>
          <Ionicons name="walk-outline" size={14} color={palette.accent.base} />
          <Text style={[styles.membershipMetaText, { color: palette.text.secondary }]}>
            {t("member.membership.visitsRemaining", {
              visits: formatVisitLimit(subscription.remainingVisits),
            })}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.guidanceCard,
          {
            borderColor:
              guidanceTone === "amber"
                ? palette.feedback.warning
                : guidanceTone === "red"
                  ? palette.feedback.danger
                  : "transparent",
            backgroundColor:
              guidanceTone === "amber"
                ? palette.surface.warningSoft
                : guidanceTone === "red"
                  ? palette.surface.dangerSoft
                  : "transparent",
            paddingHorizontal: guidanceTone === "amber" || guidanceTone === "red" ? spacing.md : 0,
          },
        ]}
      >
        {guidanceShowsIcon ? (
          <IconBubble icon="information-circle-outline" tone={guidanceTone} size={32} />
        ) : null}
        <View style={styles.guidanceCopy}>
          <Text style={[styles.guidanceTitle, { color: palette.text.primary }]}>
            {guidance.title}
          </Text>
          <Text style={[styles.guidanceBody, { color: palette.text.secondary }]}>
            {guidance.body}
          </Text>
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
            accessibilityLabel={t("member.membership.pauseEndDateAccessibility")}
            label={t("member.membership.pauseUntil")}
            value={pauseResumesAt}
            minimumDate={pauseMinimumDate()}
            onChange={onPauseDateChange}
          />
          <Text style={[styles.pauseHelp, { color: palette.text.secondary }]}>
            {t("member.membership.pauseHelp")}
          </Text>
        </View>
      ) : null}
      <ZookButton
        testID="membership-pause-resume-button"
        variant="secondary"
        disabled={actionBusy || (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED")}
        onPress={() => onPauseOrResume(subscription)}
        icon={subscription.status === "PAUSED" ? "play-circle-outline" : "pause-circle-outline"}
      >
        {subscription.status === "PAUSED" ? t("member.membership.resumeMembership") : t("member.membership.pauseMembership")}
      </ZookButton>
      {actionStatus ? (
        <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{actionStatus}</Text>
      ) : null}
      {onTerminate && subscription.status !== "CANCELLED" ? (
        <ZookButton
          testID="membership-cancel-button"
          variant="destructive"
          disabled={Boolean(terminateBusy)}
          onPress={() => onTerminate(subscription)}
          icon="close-circle-outline"
        >
          {t("member.membership.cancelMembership")}
        </ZookButton>
      ) : null}
      {terminateStatus ? (
        <Text style={[styles.statusMessage, { color: palette.feedback.danger }]}>
          {terminateStatus}
        </Text>
      ) : null}
    </Card>
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
    ...typography.cardTitle,
  },
  featuredOrg: {
    ...typography.small,
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressText: {
    ...typography.small,
  },
  progressTextMuted: {
    ...typography.small,
  },
  membershipMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  membershipMetaText: {
    ...typography.small,
  },
  guidanceCard: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
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
    ...typography.bodyStrong,
  },
  guidanceBody: {
    ...typography.small,
  },
  pausePicker: {
    marginTop: -spacing.xs,
    gap: spacing.xs,
  },
  pauseHelp: {
    ...typography.small,
  },
  statusMessage: {
    ...typography.small,
  },
});
