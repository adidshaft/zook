import { StyleSheet, Text, TextInput, View } from "react-native";

import { Card, PrimaryButton } from "@/components/primitives";
import type { GymProfileData } from "@/lib/domains";
import { formatInr } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { planNameForLocale } from "./gym-plans-section";

type PublicPlan = NonNullable<GymProfileData["plans"]>[number];

type GymNextActionCardProps = {
  approvedJoinRequest: boolean;
  busyAction: string | null;
  canCheckoutSelectedPlan: boolean;
  inviteCode: string;
  inviteOnlyLocked: boolean;
  needsApproval: boolean;
  onApplyInviteCode: () => void;
  onInviteCodeChange: (value: string) => void;
  onRequestMembership: () => void;
  onStartCheckout: (planId: string) => void;
  pendingJoinRequest: boolean;
  selectedCheckoutPlan: PublicPlan | null;
  selectedCheckoutPlanPrice?: number | null;
};

export function GymNextActionCard({
  approvedJoinRequest,
  busyAction,
  canCheckoutSelectedPlan,
  inviteCode,
  inviteOnlyLocked,
  needsApproval,
  onApplyInviteCode,
  onInviteCodeChange,
  onRequestMembership,
  onStartCheckout,
  pendingJoinRequest,
  selectedCheckoutPlan,
  selectedCheckoutPlanPrice,
}: GymNextActionCardProps) {
  const { locale, t } = useI18n();
  const { mode, palette } = useTheme();

  return (
    <Card
      variant={needsApproval || inviteOnlyLocked ? "warning" : "default"}
      contentStyle={styles.card}
    >
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>
          {needsApproval
            ? t("gymProfile.reviewed")
            : inviteOnlyLocked
              ? t("gymProfile.inviteOnly")
              : t("gymProfile.readyToJoin")}
        </Text>
        <Text numberOfLines={2} style={[styles.title, { color: palette.text.primary }]}>
          {selectedCheckoutPlan
            ? planNameForLocale(selectedCheckoutPlan, locale, t)
            : t("gymProfile.choosePlanToContinue")}
        </Text>
        {selectedCheckoutPlan && !needsApproval && !inviteOnlyLocked ? (
          <Text numberOfLines={1} style={[styles.body, { color: palette.text.secondary }]}>
            {t("gymProfile.tapPlanToChange")}
          </Text>
        ) : null}
      </View>
      {needsApproval && !pendingJoinRequest && !approvedJoinRequest ? (
        <PrimaryButton testID="gym-top-request-membership" onPress={onRequestMembership}>
          {busyAction === "join-request"
            ? t("gymProfile.submitting")
            : t("gymProfile.sendMembershipRequest")}
        </PrimaryButton>
      ) : inviteOnlyLocked ? (
        <View style={styles.inviteCodeRow}>
          <TextInput
            testID="gym-top-invite-code"
            value={inviteCode}
            onChangeText={onInviteCodeChange}
            accessibilityLabel={t("gymProfile.inviteCode")}
            autoCapitalize="characters"
            placeholder={t("gymProfile.inviteCode")}
            placeholderTextColor={palette.text.tertiary}
            style={[
              styles.inviteCodeInput,
              {
                backgroundColor: mode === "dark" ? palette.bg.sunken : palette.surface.raised,
                borderColor: palette.border.default,
                color: palette.text.primary,
              },
            ]}
          />
          <PrimaryButton testID="gym-top-apply-invite-code" onPress={onApplyInviteCode}>
            {t("gymProfile.apply")}
          </PrimaryButton>
        </View>
      ) : selectedCheckoutPlan ? (
        <PrimaryButton
          testID="gym-top-choose-plan"
          onPress={() => onStartCheckout(selectedCheckoutPlan.id)}
          disabled={!canCheckoutSelectedPlan}
        >
          {busyAction === selectedCheckoutPlan.id
            ? t("gymProfile.openingPayment")
            : canCheckoutSelectedPlan
              ? t("gymProfile.payAmountNow", { amount: formatInr(selectedCheckoutPlanPrice) })
              : t("gymProfile.completeEarlierStep")}
        </PrimaryButton>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.cardTitle,
  },
  body: {
    ...typography.small,
  },
  inviteCodeRow: {
    gap: spacing.sm,
  },
  inviteCodeInput: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
});
