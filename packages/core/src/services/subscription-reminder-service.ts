export type SubscriptionReminderKind =
  | "PAYMENT_FAILED"
  | "PAYMENT_RETRY"
  | "TRIAL_EXPIRING"
  | "SUBSCRIPTION_EXPIRING"
  | "MANUAL_FOLLOW_UP";

export type SubscriptionReminderStatus = "PENDING" | "SENT" | "RESOLVED" | "CANCELLED";

export interface SubscriptionReminderState {
  id?: string;
  orgId: string;
  userId: string;
  subscriptionId?: string;
  mandateId?: string;
  paymentId?: string;
  kind: SubscriptionReminderKind;
  status: SubscriptionReminderStatus;
  dueAt: Date;
  sentAt?: Date;
  resolvedAt?: Date;
  attemptCount?: number;
}

export function createSubscriptionReminder(input: {
  orgId: string;
  userId: string;
  subscriptionId?: string;
  mandateId?: string;
  paymentId?: string;
  kind: SubscriptionReminderKind;
  now?: Date;
  dueInMs?: number;
}): SubscriptionReminderState {
  const now = input.now ?? new Date();
  return {
    orgId: input.orgId,
    userId: input.userId,
    ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
    ...(input.mandateId ? { mandateId: input.mandateId } : {}),
    ...(input.paymentId ? { paymentId: input.paymentId } : {}),
    kind: input.kind,
    status: "PENDING",
    dueAt: new Date(now.getTime() + (input.dueInMs ?? 0)),
    attemptCount: 0,
  };
}

export function transitionSubscriptionReminder(
  reminder: SubscriptionReminderState,
  nextStatus: SubscriptionReminderStatus,
  now = new Date(),
): SubscriptionReminderState {
  if (reminder.status === "RESOLVED" && nextStatus !== "RESOLVED") {
    throw new Error("Resolved reminders cannot be reopened");
  }
  return {
    ...reminder,
    status: nextStatus,
    ...(nextStatus === "SENT" ? { sentAt: reminder.sentAt ?? now } : {}),
    ...(nextStatus === "RESOLVED" ? { resolvedAt: reminder.resolvedAt ?? now } : {}),
  };
}

export function shouldCreatePaymentFailureReminder(input: {
  mandateStatus?: string | null;
  eventType: string;
}) {
  return (
    input.eventType === "payment.failed" ||
    input.eventType === "invoice.payment_failed" ||
    input.mandateStatus === "FAILED" ||
    input.mandateStatus === "HALTED"
  );
}
