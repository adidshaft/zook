import { Card } from "./foundation";

export {
  AlertCard,
  AuditWarning,
  Card,
  ConfirmationRing,
  EntryCodeCard,
  FieldCard,
  GlassPanel,
  KPIBox,
  MetricCard,
  MetricTile,
  MoneySummaryCard,
  OperationalQueueCard,
  ProgressBar,
  ProgressRing,
  QueueCard,
  StatCard,
  StatusRing,
  TaskResultCard,
  WebHandoffCard,
} from "./foundation";

export function PressableCard({
  pressable: _pressable,
  ...props
}: Parameters<typeof Card>[0]) {
  return <Card {...props} pressable />;
}
