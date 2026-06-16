import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";
import { AuditWarning } from "./audit-warning";
import { DetailRow } from "./detail-row";
import { Card, StatusChip } from "./foundation";
import { IconBubble } from "./icon-bubble";
import type { PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

type TaskResultTone = "success" | "pending" | "failure" | "blocked";

function toneForTaskResult(tone: TaskResultTone): PillTone {
  if (tone === "success") return "lime";
  if (tone === "pending") return "amber";
  return "red";
}

function iconForTaskResult(tone: TaskResultTone): IconName {
  if (tone === "success") return "checkmark-circle-outline";
  if (tone === "pending") return "time-outline";
  if (tone === "blocked") return "ban-outline";
  return "alert-circle-outline";
}

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

export function AlertCard({
  title,
  message,
  tone = "amber",
  icon,
  action,
}: {
  title: string;
  message?: string;
  tone?: PillTone;
  icon?: IconName;
  action?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <Card variant={tone === "red" ? "danger" : tone === "amber" ? "warning" : "selected"}>
      <View style={styles.alertCardRow}>
        <IconBubble icon={icon ?? "alert-circle-outline"} tone={tone} size={38} />
        <View style={styles.alertCardCopy}>
          <Text style={[styles.alertCardTitle, { color: palette.text.primary }]}>{title}</Text>
          {message ? <Text style={[styles.alertCardMessage, { color: palette.text.secondary }]}>{message}</Text> : null}
        </View>
        {action}
      </View>
    </Card>
  );
}

export function TaskResultCard({
  title,
  message,
  tone,
  detailRows,
  primaryAction,
  secondaryAction,
  icon,
}: {
  title: string;
  message?: string;
  tone: TaskResultTone;
  detailRows?: Array<{ label: string; value: string }>;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: IconName;
}) {
  const { palette } = useTheme();
  const statusTone = toneForTaskResult(tone);
  const semanticSurface =
    tone === "success"
      ? "successCard"
      : tone === "pending"
        ? "warningCard"
        : "dangerCard";

  return (
    <Card semanticSurface={semanticSurface} accessibilityLabel={[title, message].filter(Boolean).join(". ")}>
      <View style={styles.taskResultHeader}>
        <IconBubble icon={icon ?? iconForTaskResult(tone)} tone={statusTone} size={48} />
        <View style={styles.taskResultCopy}>
          <Text style={[styles.taskResultTitle, { color: palette.text.primary }]}>{title}</Text>
          {message ? <Text style={[styles.taskResultMessage, { color: palette.text.secondary }]}>{message}</Text> : null}
        </View>
      </View>
      {detailRows?.length ? (
        <View style={styles.taskResultDetails}>
          {detailRows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </View>
      ) : null}
      {primaryAction || secondaryAction ? (
        <View style={styles.taskResultActions}>
          {secondaryAction}
          {primaryAction}
        </View>
      ) : null}
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
        <IconBubble icon="receipt-outline" tone="amber" size={44} />
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

export function WebHandoffCard({
  title,
  description,
  destination,
  action,
}: {
  title: string;
  description: string;
  destination: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <Card semanticSurface="handoffCard" accessibilityLabel={`${title}. Opens ${destination} on web.`}>
      <View style={styles.webHandoffRow}>
        <IconBubble icon="desktop-outline" tone="blue" size={44} />
        <View style={styles.webHandoffCopy}>
          <Text style={[styles.webHandoffTitle, { color: palette.text.primary }]}>{title}</Text>
          <Text style={[styles.webHandoffDescription, { color: palette.text.secondary }]}>{description}</Text>
          <StatusChip tone="blue" status={destination} accessibilityLabel={`Web destination ${destination}`} />
        </View>
      </View>
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
  alertCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  alertCardCopy: {
    flex: 1,
    gap: 3,
  },
  alertCardTitle: {
    ...typography.bodyStrong,
  },
  alertCardMessage: {
    ...typography.small,
  },
  taskResultHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  taskResultCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  taskResultTitle: {
    ...typography.headerTitle,
    letterSpacing: 0,
  },
  taskResultMessage: {
    ...typography.body,
  },
  taskResultDetails: {
    gap: 0,
  },
  taskResultActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
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
  webHandoffRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  webHandoffCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  webHandoffTitle: {
    ...typography.bodyStrong,
  },
  webHandoffDescription: {
    ...typography.small,
  },
});
