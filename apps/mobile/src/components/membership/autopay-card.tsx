import { StyleSheet, Text, View } from "react-native";
import { GlassCard, IconBubble, Pill, ZookButton } from "@/components/primitives";
import { formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { colors, spacing, typography } from "@/lib/theme";
import { isAutopayLive } from "./helpers";
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
  const live = isAutopayLive(subscription.autopay);
  return (
    <GlassCard variant="compact" contentStyle={styles.autopayContent}>
      <View style={styles.autopayHeader}>
        <IconBubble icon="repeat-outline" tone={live ? "lime" : "blue"} size={36} />
        <View style={styles.autopayCopy}>
          <Text style={styles.autopayTitle}>Autopay</Text>
          <Text style={styles.autopayBody}>
            {live
              ? subscription.autopay?.nextChargeAt
                ? `Next renewal ${formatLongDate(subscription.autopay.nextChargeAt)}`
                : "Recurring renewal is enabled."
              : "Authorize automatic renewal to renew this plan automatically."}
          </Text>
          {autopayStatus ? <Text style={styles.autopayStatus}>{autopayStatus}</Text> : null}
        </View>
        <Pill tone={live ? "lime" : "blue"}>
          {live ? titleCaseFromCode(subscription.autopay?.status ?? "ACTIVE") : "Off"}
        </Pill>
      </View>
      {live ? (
        <ZookButton
          tone="secondary"
          disabled={autopayBusy}
          onPress={() => onCancel(subscription)}
          icon="close-circle-outline"
        >
          {autopayBusy ? "Updating..." : "Cancel autopay"}
        </ZookButton>
      ) : (
        <ZookButton
          disabled={autopayBusy || subscription.status !== "ACTIVE"}
          onPress={() => onEnable(subscription)}
          icon="repeat-outline"
        >
          {autopayBusy ? "Starting..." : "Enable autopay"}
        </ZookButton>
      )}
    </GlassCard>
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
    color: colors.text,
    ...typography.cardTitle,
  },
  autopayBody: {
    color: colors.muted,
    ...typography.small,
  },
  autopayStatus: {
    color: colors.lime,
    ...typography.small,
  },
});
