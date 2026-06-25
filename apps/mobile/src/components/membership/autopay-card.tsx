import { StyleSheet, Text, View } from "react-native";
import { Card, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { isAutopayEnabled } from "./helpers";
import type { MembershipRecord } from "./types";

export function AutopayCard({
  autopayBusy,
  autopayStatus,
  onCancel,
  onEnable,
  subscription,
}: {
  autopayBusy: boolean;
  autopayStatus: string;
  onCancel: (subscription: MembershipRecord) => void;
  onEnable: (subscription: MembershipRecord) => void;
  subscription: MembershipRecord;
}) {
  const { palette } = useTheme();
  const t = useT();
  const enabled = isAutopayEnabled(subscription.autopay);
  return (
    <Card variant="compact" contentStyle={styles.autopayContent}>
      <View style={styles.autopayHeader}>
        <IconBubble icon="repeat-outline" tone={enabled ? "blue" : "neutral"} size={36} />
        <View style={styles.autopayCopy}>
          <Text style={[styles.autopayTitle, { color: palette.text.primary }]}>{t("member.membership.autopay")}</Text>
          <Text style={[styles.autopayBody, { color: palette.text.secondary }]}>
            {enabled
              ? subscription.autopay?.nextChargeAt
                ? t("member.membership.nextRenewalDate", { date: formatLongDate(subscription.autopay.nextChargeAt) })
                : t("member.membership.recurringRenewalEnabled")
              : t("member.membership.authorizeAutopay")}
          </Text>
          {autopayStatus ? (
            <Text style={[styles.autopayStatus, { color: palette.feedback.info }]}>
              {autopayStatus}
            </Text>
          ) : null}
        </View>
        <Pill tone={enabled ? "blue" : "neutral"}>
          {enabled ? titleCaseFromCode(subscription.autopay?.status ?? "ACTIVE") : t("member.membership.off")}
        </Pill>
      </View>
      {enabled ? (
        <ZookButton
          variant="secondary"
          disabled={autopayBusy}
          onPress={() => onCancel(subscription)}
          icon="close-circle-outline"
        >
          {autopayBusy ? t("member.membership.updating") : t("member.membership.cancelAutopay")}
        </ZookButton>
      ) : (
        <ZookButton
          disabled={autopayBusy || subscription.status !== "ACTIVE"}
          onPress={() => onEnable(subscription)}
          icon="repeat-outline"
        >
          {autopayBusy ? t("member.membership.starting") : t("member.membership.enableAutopay")}
        </ZookButton>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  autopayContent: {
    gap: spacing.md,
  },
  autopayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  autopayCopy: {
    flex: 1,
    gap: 4,
  },
  autopayTitle: {
    ...typography.cardTitle,
  },
  autopayBody: {
    ...typography.small,
  },
  autopayStatus: {
    ...typography.small,
  },
});
