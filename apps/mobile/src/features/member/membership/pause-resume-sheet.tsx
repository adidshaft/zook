import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { DatePickerField, ZookButton } from "@/components/primitives";
import { isAutopayEnabled } from "@/components/membership/helpers";
import type { MembershipRecord } from "@/components/membership";
import { formatLongDate } from "@/lib/formatting";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

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

export function PauseResumeSheet({
  actionBusy,
  actionStatus,
  autopayBusy,
  autopayStatus,
  onCancelAutopay,
  onClose,
  onEnableAutopay,
  onPauseDateChange,
  onPauseOrResume,
  onPauseReasonChange,
  onTerminate,
  open,
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
  autopayBusy: boolean;
  autopayStatus: string;
  onCancelAutopay: () => void;
  onClose: () => void;
  onEnableAutopay: () => void;
  onPauseDateChange: (date: Date) => void;
  onPauseOrResume: () => void;
  onPauseReasonChange: (reason: string) => void;
  onTerminate: () => void;
  open: boolean;
  pauseMinimumDate: () => Date;
  pauseReason: string;
  pauseReasonOptions: string[];
  pauseResumesAt: Date;
  subscription: MembershipRecord;
  terminateBusy?: boolean;
  terminateStatus?: string;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { locale, t } = useI18n();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);
  const canPause = subscription.status === "ACTIVE";
  const autopayEnabled = isAutopayEnabled(subscription.autopay);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [open]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        ...styles.sheetBackground,
        backgroundColor: palette.bg.elevated,
        borderColor: palette.border.default,
      }}
      handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
      maxDynamicContentSize={screenHeight * 0.76}
      bottomInset={insets.bottom + 12}
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
              {t("member.membership.manageMembership")}
            </Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {subscription.plan?.name ?? t("member.membership.activePlan")}
            </Text>
            <Text style={[styles.sheetBody, { color: palette.text.secondary }]}>
              {t("member.membership.manageMembershipBody")}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("common.dismiss")}
            style={({ pressed }) => [
              styles.closeButton,
              { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
              pressed ? styles.closeButtonPressed : null,
            ]}
          >
            <Ionicons name="close" size={18} color={palette.text.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.manageSummaryRow,
            { backgroundColor: palette.bg.sunken, borderColor: palette.border.subtle },
          ]}
        >
          <Ionicons
            name={autopayEnabled ? "repeat-outline" : "card-outline"}
            size={18}
            color={autopayEnabled ? palette.accent.base : palette.text.secondary}
          />
          <View style={styles.manageSummaryCopy}>
            <Text style={[styles.manageSummaryTitle, { color: palette.text.primary }]}>
              {autopayEnabled
                ? t("member.membership.autopayEnabledTitle")
                : t("member.membership.manualRenewalTitle")}
            </Text>
            <Text numberOfLines={2} style={[styles.manageSummaryBody, { color: palette.text.secondary }]}>
              {autopayEnabled
                ? subscription.autopay?.nextChargeAt
                  ? t("member.membership.nextRenewalDate", {
                      date: formatLongDate(subscription.autopay.nextChargeAt, undefined, locale),
                    })
                  : t("member.membership.recurringRenewalEnabled")
                : t("member.membership.manualRenewalBody")}
            </Text>
          </View>
        </View>

        <View style={styles.manageQuickActions}>
          {autopayEnabled ? (
            <ZookButton
              testID="membership-cancel-autopay-button"
              variant="secondary"
              disabled={autopayBusy}
              onPress={onCancelAutopay}
              icon="close-circle-outline"
              style={styles.manageQuickAction}
            >
              {t("member.membership.cancelAutopay")}
            </ZookButton>
          ) : subscription.status === "ACTIVE" ? (
            <ZookButton
              testID="membership-enable-autopay-button"
              disabled={autopayBusy}
              busy={autopayBusy}
              busyLabel={t("member.membership.starting")}
              onPress={onEnableAutopay}
              icon="flash-outline"
              style={styles.manageQuickAction}
            >
              {t("member.membership.autopaySetupAction")}
            </ZookButton>
          ) : null}
        </View>
        {autopayStatus ? (
          <Text style={[styles.statusMessage, { color: palette.feedback.info }]}>
            {autopayStatus}
          </Text>
        ) : null}

        {canPause ? (
          <View style={[styles.manageDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.pauseMembership")}
              accessibilityState={{ expanded: pauseOpen }}
              onPress={() => setPauseOpen((current) => !current)}
              style={({ pressed }) => [
                styles.manageDisclosureHeader,
                pressed ? styles.manageDisclosurePressed : null,
              ]}
            >
              <View style={styles.manageDisclosureCopy}>
                <Text style={[styles.manageDisclosureTitle, { color: palette.text.primary }]}>
                  {t("member.membership.pauseMembership")}
                </Text>
                <Text numberOfLines={2} style={[styles.manageDisclosureBody, { color: palette.text.secondary }]}>
                  {t("member.membership.pauseDisclosureBody")}
                </Text>
              </View>
              <Ionicons
                name={pauseOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </Pressable>
            {pauseOpen ? (
              <View style={styles.manageSheetGroup}>
                <DatePickerField
                  accessibilityLabel={t("member.membership.pauseEndDateAccessibility")}
                  label={t("member.membership.pauseUntil")}
                  value={pauseResumesAt}
                  minimumDate={pauseMinimumDate()}
                  onChange={onPauseDateChange}
                />
                <Text style={[styles.manageSheetHelp, { color: palette.text.secondary }]}>
                  {t("member.membership.pauseHelp")}
                </Text>
                <View style={styles.manageReasonRow}>
                  {pauseReasonOptions.map((reason) => {
                    const selected = reason === pauseReason;
                    return (
                      <Pressable
                        key={reason}
                        accessibilityRole="button"
                        onPress={() => onPauseReasonChange(reason)}
                        style={({ pressed }) => [
                          styles.manageReasonChip,
                          {
                            backgroundColor: selected ? palette.surface.accentSoft : palette.bg.sunken,
                            borderColor: selected ? palette.border.focus : palette.border.subtle,
                          },
                          pressed ? styles.manageReasonChipPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.manageReasonText,
                            { color: selected ? palette.accent.base : palette.text.secondary },
                          ]}
                        >
                          {t(pauseReasonLabelKey(reason))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ZookButton
                  testID="membership-pause-resume-button"
                  variant="secondary"
                  disabled={actionBusy}
                  onPress={onPauseOrResume}
                  icon="pause-circle-outline"
                >
                  {t("member.membership.pauseMembership")}
                </ZookButton>
              </View>
            ) : null}
          </View>
        ) : subscription.status === "PAUSED" ? (
          <ZookButton
            testID="membership-pause-resume-button"
            variant="secondary"
            disabled={actionBusy}
            onPress={onPauseOrResume}
            icon="play-circle-outline"
          >
            {t("member.membership.resumeMembership")}
          </ZookButton>
        ) : null}

        {actionStatus ? (
          <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{actionStatus}</Text>
        ) : null}
        {subscription.status !== "CANCELLED" ? (
          <View style={[styles.manageDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.endMembershipOptions")}
              accessibilityState={{ expanded: endOpen }}
              onPress={() => setEndOpen((current) => !current)}
              style={({ pressed }) => [
                styles.manageDisclosureHeader,
                pressed ? styles.manageDisclosurePressed : null,
              ]}
            >
              <View style={styles.manageDisclosureCopy}>
                <Text style={[styles.manageDisclosureTitle, { color: palette.text.primary }]}>
                  {t("member.membership.endMembershipOptions")}
                </Text>
                <Text numberOfLines={2} style={[styles.manageDisclosureBody, { color: palette.text.secondary }]}>
                  {t("member.membership.endMembershipBody")}
                </Text>
              </View>
              <Ionicons
                name={endOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </Pressable>
            {endOpen ? (
              <View style={styles.manageSheetGroup}>
                <ZookButton
                  testID="membership-cancel-button"
                  variant="destructive"
                  disabled={Boolean(terminateBusy)}
                  onPress={onTerminate}
                  icon="close-circle-outline"
                >
                  {t("member.membership.cancelMembership")}
                </ZookButton>
              </View>
            ) : null}
          </View>
        ) : null}
        {terminateStatus ? (
          <Text style={[styles.statusMessage, { color: palette.feedback.danger }]}>
            {terminateStatus}
          </Text>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  sheet: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 4,
  },
  sheetEyebrow: {
    ...typography.eyebrow,
  },
  sheetTitle: {
    ...typography.headerTitle,
  },
  sheetBody: {
    ...typography.body,
  },
  manageSheetGroup: {
    gap: spacing.sm,
  },
  manageSummaryRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageSummaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  manageSummaryTitle: {
    ...typography.bodyStrong,
  },
  manageSummaryBody: {
    ...typography.small,
  },
  manageQuickActions: {
    flexDirection: "row",
  },
  manageQuickAction: {
    flex: 1,
  },
  manageDisclosure: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  manageDisclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manageDisclosurePressed: {
    opacity: 0.82,
  },
  manageDisclosureCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  manageDisclosureTitle: {
    ...typography.bodyStrong,
  },
  manageDisclosureBody: {
    ...typography.small,
  },
  manageSheetHelp: {
    ...typography.small,
  },
  manageReasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  manageReasonChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  manageReasonChipPressed: {
    opacity: 0.82,
  },
  manageReasonText: {
    ...typography.caption,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  statusMessage: {
    ...typography.small,
  },
});
