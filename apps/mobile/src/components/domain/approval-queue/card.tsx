import { StyleSheet, Text, View } from "react-native";

import { GlassCard, IconBubble, ListRow, PrimaryButton, SecondaryButton } from "@/components/primitives";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { ApprovalItem } from "./types";

export function ApprovalQueueCard({
  approving,
  item,
  onApprove,
  onReject,
  rejecting,
  testID,
}: {
  approving?: boolean;
  item: ApprovalItem;
  onApprove: () => void;
  onReject?: () => void;
  rejecting?: boolean;
  testID?: string;
}) {
  const { palette } = useTheme();
  return (
    <GlassCard testID={testID} variant="compact" contentStyle={styles.card}>
      <ListRow
        title={item.primaryText}
        subtitle={[item.secondaryText, item.metaText].filter(Boolean).join(" · ")}
        leading={<IconBubble icon="checkmark-done-outline" tone="amber" />}
      />
      {item.reason ? <Text style={[styles.reason, { color: palette.text.secondary }]}>{item.reason}</Text> : null}
      {item.context ? <View>{item.context}</View> : null}
      <View style={styles.actions}>
        <PrimaryButton testID="approve-button-first" onPress={onApprove} disabled={approving} style={styles.action}>
          {approving ? "Approving..." : "Approve"}
        </PrimaryButton>
        {onReject ? (
          <SecondaryButton onPress={onReject} disabled={rejecting} style={styles.action}>
            {rejecting ? "Rejecting..." : "Reject"}
          </SecondaryButton>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  reason: typography.small,
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
});
