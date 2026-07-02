import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, IconBubble } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { ApprovalItem } from "./types";

export function ApprovalQueueCard({
  approving,
  highlighted,
  item,
  onApprove,
  onReject,
  rejecting,
  testID,
}: {
  approving?: boolean;
  highlighted?: boolean;
  item: ApprovalItem;
  onApprove: () => void;
  onReject?: () => void;
  rejecting?: boolean;
  testID?: string;
}) {
  const { palette } = useTheme();
  const t = useT();
  return (
    <Card
      testID={testID}
      variant="compact"
      contentStyle={[
        styles.card,
        highlighted
          ? {
              borderColor: palette.accent.base,
              borderWidth: 1.5,
            }
          : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <View style={styles.summaryRow}>
            <IconBubble icon="checkmark-done-outline" tone="neutral" size={32} />
            <View style={styles.summaryCopy}>
              <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
                {item.primaryText}
              </Text>
              <Text numberOfLines={1} style={[styles.subtitle, { color: palette.text.secondary }]}>
                {[item.secondaryText, item.metaText].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>
          {item.reason ? (
            <Text numberOfLines={1} style={[styles.reason, { color: palette.text.secondary }]}>
              {item.reason}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {onReject ? (
            <Pressable
              testID={testID ? `${testID}-reject` : undefined}
              accessibilityRole="button"
              accessibilityLabel={rejecting ? t("approvalQueue.rejecting") : t("approvalQueue.reject")}
              accessibilityState={{ disabled: rejecting }}
              disabled={rejecting}
              onPress={onReject}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconAction,
                {
                  backgroundColor: palette.bg.sunken,
                  borderColor: palette.border.default,
                  opacity: rejecting ? 0.5 : 1,
                },
                pressed && !rejecting ? styles.pressedAction : null,
              ]}
            >
              <Ionicons name="close" size={18} color={palette.text.secondary} />
            </Pressable>
          ) : null}
          <Pressable
            testID={testID ? `${testID}-approve` : undefined}
            accessibilityRole="button"
            accessibilityLabel={approving ? t("approvalQueue.approving") : t("approvalQueue.approve")}
            accessibilityState={{ disabled: approving }}
            disabled={approving}
            onPress={onApprove}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconAction,
              {
                backgroundColor: palette.surface.accentSoft,
                borderColor: palette.accent.base,
                opacity: approving ? 0.5 : 1,
              },
              pressed && !approving ? styles.pressedAction : null,
            ]}
          >
            <Ionicons name={approving ? "hourglass-outline" : "checkmark"} size={19} color={palette.accent.strong} />
          </Pressable>
        </View>
      </View>
      {item.context ? <View>{item.context}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  summaryRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
  reason: typography.caption,
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  iconAction: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  pressedAction: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
});
