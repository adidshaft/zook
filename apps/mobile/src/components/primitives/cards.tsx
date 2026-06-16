import { AuditWarning } from "./audit-warning";
import { Card } from "./foundation";
import { ProgressBar } from "./progress-bar";
import {
  AlertCard,
  MoneySummaryCard,
  OperationalQueueCard,
  TaskResultCard,
  WebHandoffCard,
} from "./summary-cards";

export {
  Card,
  EntryCodeCard,
  GlassPanel,
} from "./foundation";
export { ConfirmationRing, MetricCard, MetricTile, StatCard, StatusRing } from "./metric-primitives";
export { AlertCard, MoneySummaryCard, OperationalQueueCard, TaskResultCard, WebHandoffCard };
export { AuditWarning };
export { MetricTile as KPIBox, StatusRing as ProgressRing } from "./metric-primitives";
export { ProgressBar };

export function FieldCard(props: Parameters<typeof Card>[0]) {
  return <Card variant="compact" {...props} />;
}

export function QueueCard({
  pressable: _pressable,
  ...props
}: Parameters<typeof Card>[0]) {
  return <Card pressable {...props} />;
}

export function PressableCard({
  pressable: _pressable,
  ...props
}: Parameters<typeof Card>[0]) {
  return <Card {...props} pressable />;
}
