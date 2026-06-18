import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";
import { AuditWarning } from "./audit-warning";
import { StatusChip } from "./chips";
import { DetailRow } from "./detail-row";
import { Card } from "./foundation";
import { IconBubble } from "./icon-bubble";
import type { PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

export function OperationalQueueCard({
  title,
  subtitle,
  meta,
  status,
  tone = "amber",
  icon = "list-outline",
  actionLabel,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  tone?: PillTone;
  icon?: IconName;
  actionLabel?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { palette } = useTheme();

  return (
    <Card
      pressable={Boolean(onPress)}
      semanticSurface={tone === "red" ? "dangerCard" : tone === "lime" ? "successCard" : "taskCard"}
      onPress={onPress}
      accessibilityLabel={
        accessibilityLabel ??
        [actionLabel ?? "Open queue item", title, status, meta].filter(Boolean).join(", ")
      }
      accessibilityHint={actionLabel ? `${actionLabel}.` : undefined}
    >
      <View style={styles.operationalQueueRow}>
        <IconBubble icon={icon} tone={tone} size={42} />
        <View style={styles.operationalQueueCopy}>
          <Text style={[styles.operationalQueueTitle, { color: palette.text.primary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.operationalQueueSubtitle, { color: palette.text.secondary }]}>{subtitle}</Text> : null}
          {meta ? <Text style={[styles.operationalQueueMeta, { color: palette.text.tertiary }]}>{meta}</Text> : null}
        </View>
        {status ? <StatusChip status={status} tone={tone} accessibilityLabel={`${status} status`} /> : null}
      </View>
    </Card>
  );
}

export function MoneySummaryCard({
  title,
  amount,
  rows,
  consequence,
  action,
}: {
  title: string;
  amount: string;
  rows: Array<{ label: string; value: string }>;
  consequence?: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <Card semanticSurface="moneyFlowCard" accessibilityLabel={`${title}. Total ${amount}`}>
      <View style={styles.moneySummaryHeader}>
        <View>
          <Text style={[styles.moneySummaryTitle, { color: palette.text.secondary }]}>{title}</Text>
          <Text style={[styles.moneySummaryAmount, { color: palette.text.primary }]}>{amount}</Text>
        </View>
        <IconBubble icon="receipt-outline" tone="neutral" size={44} />
      </View>
      <View style={styles.moneySummaryRows}>
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </View>
      {consequence ? <AuditWarning>{consequence}</AuditWarning> : null}
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  operationalQueueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  operationalQueueCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  operationalQueueTitle: {
    ...typography.bodyStrong,
  },
  operationalQueueSubtitle: {
    ...typography.small,
  },
  operationalQueueMeta: {
    ...typography.caption,
  },
  moneySummaryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  moneySummaryTitle: {
    ...typography.caption,
  },
  moneySummaryAmount: {
    ...typography.metric,
  },
  moneySummaryRows: {
    gap: 0,
  },
});
