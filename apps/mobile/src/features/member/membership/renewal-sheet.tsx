import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AutopayCard } from "@/components/membership";
import { isAutopayEnabled } from "@/components/membership/helpers";
import { ZookButton } from "@/components/primitives";
import type { PublicPlanSummary } from "@/lib/domains";
import { formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { PlanPickerSection } from "./plan-picker-section";

type AutopayRecord = {
  id: string;
  status?: string | null;
  checkoutUrl?: string | null;
  provider?: string | null;
  nextChargeAt?: string | null;
  currentEndAt?: string | null;
};

type MembershipRecord = {
  id: string;
  status?: string | null;
  planId?: string | null;
  plan?:
    | (PublicPlanSummary & {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      })
    | null;
  autopay?: AutopayRecord | null;
};

export function RenewalSheet({
  autopayBusy,
  autopayStatus,
  availablePlans,
  currentPlan,
  currentSubscription,
  gymName,
  showJoinDifferentGym,
  loadingPlans,
  onClose,
  onEnableAutopay,
  onRenew,
  onSwitch,
  open,
  renewing,
  selectedPlan,
  selectedPlanId,
  setSelectedPlanId,
  status,
}: {
  autopayBusy: boolean;
  autopayStatus: string;
  availablePlans: PublicPlanSummary[];
  currentPlan: MembershipRecord["plan"];
  currentSubscription: MembershipRecord | null;
  gymName: string;
  showJoinDifferentGym: boolean;
  loadingPlans: boolean;
  onClose: () => void;
  onEnableAutopay: (subscription: MembershipRecord) => void;
  onRenew: () => void;
  onSwitch: () => void;
  open: boolean;
  renewing: boolean;
  selectedPlan: PublicPlanSummary | MembershipRecord["plan"] | null;
  selectedPlanId?: string;
  setSelectedPlanId: (planId: string) => void;
  status: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const t = useT();
  const { height: screenHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["CONTENT_HEIGHT"], []);
  const maxPlanListHeight = Math.min(420, Math.max(240, screenHeight * 0.36));
  const plans = availablePlans.length
    ? availablePlans
    : currentPlan?.id
      ? [currentPlan as PublicPlanSummary]
      : [];
  const selectedAmount =
    selectedPlan && "pricePaise" in selectedPlan ? formatInr(selectedPlan.pricePaise) : null;
  const showAutopayPrompt =
    Boolean(currentSubscription) &&
    currentSubscription?.status === "ACTIVE" &&
    !isAutopayEnabled(currentSubscription.autopay);
  const [autopayChoiceOpen, setAutopayChoiceOpen] = useState(false);
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
      maxDynamicContentSize={screenHeight * 0.82}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      bottomInset={insets.bottom + 12}
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleCopy}>
            <Text style={[styles.sheetEyebrow, { color: palette.accent.base }]}>
              {t("member.membership.renewMembership")}
            </Text>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {t("member.membership.choosePlan")}
            </Text>
            <Text style={[styles.sheetBody, { color: palette.text.secondary }]}>
              {t("member.membership.renewalSheetBody", { gym: gymName })}
            </Text>
          </View>
          <Pressable
            testID="membership-renewal-close"
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

        <PlanPickerSection
          loadingPlans={loadingPlans}
          maxHeight={maxPlanListHeight}
          plans={plans}
          renewing={renewing}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
        />

        {status ? (
          <Text style={[styles.statusMessage, { color: palette.accent.base }]}>{status}</Text>
        ) : null}
        <View style={styles.sheetActions}>
          <ZookButton
            testID="membership-pay-securely"
            onPress={onRenew}
            disabled={renewing}
            busy={renewing}
            busyLabel={t("member.membership.starting")}
            icon="card-outline"
            style={styles.actionFull}
          >
            {renewing
              ? t("member.membership.starting")
              : selectedAmount
                ? t("member.membership.payAmountNow", { amount: selectedAmount })
                : t("member.membership.payNow")}
          </ZookButton>
        </View>
        {showAutopayPrompt && currentSubscription ? (
          <View style={[styles.autopayDisclosure, { borderColor: palette.border.subtle }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.membership.autopayRenewalChoiceTitle")}
              accessibilityState={{ expanded: autopayChoiceOpen }}
              onPress={() => setAutopayChoiceOpen((current) => !current)}
              style={({ pressed }) => [
                styles.autopayDisclosureHeader,
                {
                  backgroundColor: palette.bg.sunken,
                },
                pressed ? styles.autopayDisclosurePressed : null,
              ]}
            >
              <Ionicons name="repeat-outline" size={16} color={palette.text.secondary} />
              <View style={styles.autopayDisclosureCopy}>
                <Text
                  numberOfLines={1}
                  style={[styles.autopayDisclosureTitle, { color: palette.text.primary }]}
                >
                  {t("member.membership.autopayRenewalChoiceTitle")}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.autopayDisclosureBody, { color: palette.text.secondary }]}
                >
                  {t("member.membership.autopayRenewalChoiceBody")}
                </Text>
              </View>
              <Ionicons
                name={autopayChoiceOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={palette.text.secondary}
              />
            </Pressable>
            {autopayChoiceOpen ? (
              <AutopayCard
                autopayBusy={autopayBusy}
                autopayStatus={autopayStatus}
                onEnable={onEnableAutopay}
                subscription={currentSubscription}
                variant="inline"
              />
            ) : null}
          </View>
        ) : null}
        {selectedPlanId && selectedPlanId !== currentPlan?.id ? (
          <Pressable
            testID="membership-switch-now"
            accessibilityRole="button"
            accessibilityLabel={t("member.membership.switchWithoutCheckoutTitle")}
            accessibilityState={{ disabled: renewing, busy: renewing }}
            disabled={renewing}
            onPress={onSwitch}
            style={({ pressed }) => [
              styles.secondarySheetLink,
              { backgroundColor: palette.bg.sunken, borderColor: palette.border.subtle },
              pressed && !renewing ? styles.secondarySheetLinkPressed : null,
            ]}
          >
            {renewing ? <ActivityIndicator size="small" color={palette.text.secondary} /> : null}
            <Ionicons name="swap-horizontal-outline" size={16} color={palette.text.secondary} />
            <View style={styles.secondarySheetLinkCopy}>
              <Text style={[styles.secondarySheetLinkText, { color: palette.text.primary }]}>
                {renewing
                  ? t("member.membership.updating")
                  : t("member.membership.switchWithoutCheckoutTitle")}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.secondarySheetLinkBody, { color: palette.text.secondary }]}
              >
                {t("member.membership.switchWithoutCheckoutBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={palette.text.tertiary} />
          </Pressable>
        ) : null}
        {showJoinDifferentGym ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push("/gyms" as never);
            }}
            accessibilityRole="link"
            accessibilityLabel={t("member.membership.joinDifferentGym")}
            style={styles.joinDifferentGymLink}
          >
            <Ionicons name="search-outline" size={14} color={palette.text.secondary} />
            <Text style={[styles.joinDifferentGymText, { color: palette.text.secondary }]}>
              {t("member.membership.joinDifferentGym")}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={palette.text.secondary} />
          </Pressable>
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
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 5,
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  statusMessage: {
    ...typography.small,
  },
  joinDifferentGymLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  joinDifferentGymText: {
    ...typography.small,
  },
  secondarySheetLink: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondarySheetLinkPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  secondarySheetLinkCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  secondarySheetLinkText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  secondarySheetLinkBody: {
    ...typography.small,
  },
  sheetActions: {
    gap: spacing.sm,
  },
  autopayDisclosure: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  autopayDisclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  autopayDisclosurePressed: {
    opacity: 0.82,
  },
  autopayDisclosureCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  autopayDisclosureTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  autopayDisclosureBody: {
    ...typography.caption,
    lineHeight: 14,
  },
  actionFull: {
    width: "100%",
  },
});
