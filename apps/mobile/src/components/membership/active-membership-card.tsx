import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerField, Card, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate } from "@/lib/formatting";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { membershipStatusGuidance, membershipStatusLabel, planTypeLabel, toneForStatus } from "./helpers";
import type { MembershipRecord } from "./types";

function pauseReasonLabelKey(reason: string): TranslationKey {
  switch (reason) {
    case "Medical":
      return "member.membership.pauseReasonMedical";
    case "Travel":
      return "member.membership.pauseReasonTravel";
    case "Injury":
      return "member.membership.pauseReasonInjury";
    default:
      return "member.membership.pauseReasonOther";
  }
}

export function ActiveMembershipCard({
  actionBusy,
  actionStatus,
  daysLeft,
  onOpenRenewal,
  onPauseDateChange,
  onPauseReasonChange,
  onPauseOrResume,
  onOpenManage,
  onTerminate,
  pauseMinimumDate,
  pauseReason,
  pauseReasonOptions,
  pauseResumesAt,
  subscription,
  terminateBusy,
  terminateStatus,
}: {
  actionBusy: boolean;
  actionStatus: string;
  daysLeft: number | null;
  onOpenRenewal: (subscription: MembershipRecord) => void;
  onPauseDateChange: (date: Date) => void;
  onPauseReasonChange: (reason: string) => void;
  onPauseOrResume: (subscription: MembershipRecord) => void;
  onOpenManage?: () => void;
  onTerminate?: (subscription: MembershipRecord) => void;
  pauseMinimumDate: () => Date;
  pauseReason: string;
  pauseReasonOptions: string[];
  pauseResumesAt: Date;
  subscription: MembershipRecord;
  terminateBusy?: boolean;
  terminateStatus?: string;
}) {
  const { palette } = useTheme();
  const { locale, t } = useI18n();
  const [manageOpen, setManageOpen] = useState(subscription.status === "PAUSED");
  const guidance = membershipStatusGuidance(subscription.status, daysLeft, t);
  const guidanceTone = toneForStatus(subscription.status);
  const guidanceShowsIcon = guidanceTone === "amber" || guidanceTone === "red";
  const isWarning = daysLeft !== null && daysLeft <= 7;
  const isHealthyActive = subscription.status === "ACTIVE" && !isWarning;
  const showGuidanceCard = !isHealthyActive || guidanceShowsIcon;
  const durationDays = subscription.plan?.durationDays ?? subscription.plan?.validityDays ?? null;
  const planMetaParts = [
    planTypeLabel(subscription.plan?.type, t),
    durationDays
      ? t("member.membership.days", { count: durationDays })
      : t("member.membership.gymDefinedValidity"),
  ].filter(Boolean);
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
  const manageInSheet = Boolean(onOpenManage);
  const handleManagePress = () => {
    if (onOpenManage) {
      onOpenManage();
      return;
    }
    setManageOpen((current) => !current);
  };

  return (
    <Card
      variant={subscription.status === "ACTIVE" ? "success" : "default"}
      contentStyle={styles.featuredContent}
    >
      <View style={styles.featuredHeader}>
        <IconBubble icon="card-outline" tone={toneForStatus(subscription.status)} size={40} />
        <View style={styles.featuredCopy}>
          <Text numberOfLines={1} style={[styles.featuredTitle, { color: palette.text.primary }]}>
            {subscription.plan?.name ?? t("member.membership.eyebrow")}
          </Text>
          <Text numberOfLines={1} style={[styles.featuredOrg, { color: palette.text.secondary }]}>
            {planMetaParts.join(" · ")}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pill tone={toneForStatus(subscription.status)}>
            {membershipStatusLabel(subscription.status, t)}
          </Pill>
          {subscription.status !== "PAUSED" && manageInSheet ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.manageMembership")}
              onPress={handleManagePress}
              style={({ pressed }) => [
                styles.headerManageButton,
                {
                  backgroundColor: palette.bg.sunken,
                  borderColor: palette.border.subtle,
                },
                pressed ? styles.manageTogglePressed : null,
              ]}
            >
              <Ionicons name="ellipsis-horizontal" size={17} color={palette.text.secondary} />
            </Pressable>
          ) : null}
        </View>
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
              numberOfLines={1}
              style={[
                styles.progressText,
                { color: isWarning ? palette.feedback.warning : palette.accent.base },
              ]}
            >
              {daysLeftLabel}
            </Text>
            <Text numberOfLines={1} style={[styles.progressTextMuted, { color: palette.text.secondary }]}>
              {subscription.endsAt ? formatLongDate(subscription.endsAt, "", locale) : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {subscription.remainingVisits !== null && subscription.remainingVisits !== undefined ? (
        <View style={styles.membershipMetaLine}>
          <Ionicons name="walk-outline" size={14} color={palette.accent.base} />
          <Text style={[styles.membershipMetaText, { color: palette.text.secondary }]}>
            {t("member.membership.visitsRemaining", {
              visits: t("member.membership.visitCount", { count: subscription.remainingVisits }),
            })}
          </Text>
        </View>
      ) : null}

      {showGuidanceCard ? (
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
      ) : null}

      {isHealthyActive ? null : (
        <ZookButton
          testID="membership-renew-button"
          onPress={() => onOpenRenewal(subscription)}
          icon="refresh-outline"
        >
          {guidance.action}
        </ZookButton>
      )}

      {subscription.status !== "PAUSED" && !manageInSheet ? (
        <View style={[styles.actionTray, isHealthyActive ? styles.actionTrayEnd : null]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.membership.manageMembership")}
            accessibilityState={{ expanded: manageOpen }}
            onPress={handleManagePress}
            style={({ pressed }) => [
              manageOpen && !manageInSheet ? styles.manageToggleOpen : styles.manageToggleClosed,
              {
                backgroundColor: palette.bg.sunken,
                borderColor: palette.border.subtle,
              },
              pressed ? styles.manageTogglePressed : null,
            ]}
          >
            {manageOpen && !manageInSheet ? (
              <View style={styles.manageToggleCopy}>
                <Text style={[styles.manageToggleTitle, { color: palette.text.primary }]}>
                  {t("member.membership.manageMembership")}
                </Text>
                <Text style={[styles.manageToggleBody, { color: palette.text.secondary }]}>
                  {t("member.membership.manageMembershipBody")}
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={manageInSheet ? "ellipsis-horizontal" : manageOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={palette.text.secondary}
            />
          </Pressable>
        </View>
      ) : null}

      {subscription.status !== "PAUSED" && manageOpen && !manageInSheet ? (
        <View style={styles.managePanel}>
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
            <View style={styles.pauseReasons}>
              {pauseReasonOptions.map((reason) => {
                const selected = reason === pauseReason;
                return (
                  <Pressable
                    key={reason}
                    accessibilityRole="button"
                    onPress={() => onPauseReasonChange(reason)}
                    style={({ pressed }) => [
                      styles.pauseReason,
                      {
                        backgroundColor: selected ? palette.surface.accentSoft : palette.bg.sunken,
                        borderColor: selected ? palette.border.focus : palette.border.subtle,
                      },
                      pressed ? styles.pauseReasonPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pauseReasonText,
                        { color: selected ? palette.accent.base : palette.text.secondary },
                      ]}
                    >
                      {t(pauseReasonLabelKey(reason))}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ZookButton
            testID="membership-pause-resume-button"
            variant="secondary"
            disabled={actionBusy || subscription.status !== "ACTIVE"}
            onPress={() => onPauseOrResume(subscription)}
            icon="pause-circle-outline"
          >
            {t("member.membership.pauseMembership")}
          </ZookButton>
        </View>
      ) : subscription.status === "PAUSED" ? (
        <ZookButton
          testID="membership-pause-resume-button"
          variant="secondary"
          disabled={actionBusy}
          onPress={() => onPauseOrResume(subscription)}
          icon="play-circle-outline"
        >
          {t("member.membership.resumeMembership")}
        </ZookButton>
      ) : null}
      {actionStatus ? (
        <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{actionStatus}</Text>
      ) : null}
      {onTerminate && subscription.status !== "CANCELLED" && manageOpen ? (
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
    minWidth: 0,
  },
  featuredTitle: {
    ...typography.cardTitle,
  },
  featuredOrg: {
    ...typography.small,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerManageButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: "center",
    width: 36,
  },
  actionTray: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionTrayEnd: {
    justifyContent: "flex-end",
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
    flex: 1,
    minWidth: 0,
  },
  progressTextMuted: {
    ...typography.small,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "right",
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
  manageToggleOpen: {
    flex: 1,
    minHeight: 44,
    flexShrink: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  manageToggleClosed: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  manageTogglePressed: {
    opacity: 0.86,
  },
  manageToggleCopy: {
    flexShrink: 1,
    gap: 3,
  },
  manageToggleTitle: {
    ...typography.caption,
    fontWeight: "700",
  },
  manageToggleBody: {
    ...typography.small,
  },
  managePanel: {
    gap: spacing.sm,
  },
  pausePicker: {
    marginTop: -spacing.xs,
    gap: spacing.xs,
  },
  pauseHelp: {
    ...typography.small,
  },
  pauseReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pauseReason: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pauseReasonPressed: {
    opacity: 0.82,
  },
  pauseReasonText: {
    ...typography.caption,
  },
  statusMessage: {
    ...typography.small,
  },
});
