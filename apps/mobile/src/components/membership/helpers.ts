import type { TranslationKey } from "@/lib/i18n";
import { titleCaseFromCode } from "@/lib/formatting";

export function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") return "lime" as const;
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PAST_DUE") {
    return "amber" as const;
  }
  if (
    status === "EXPIRED" ||
    status === "CANCELLED" ||
    status === "REJECTED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  ) {
    return "red" as const;
  }
  return "blue" as const;
}

type MembershipT = (key: TranslationKey, values?: Record<string, string | number>) => string;

const membershipStatusLabelKeys: Record<string, TranslationKey> = {
  ACTIVE: "memberList.status.active",
  CANCELLED: "memberList.status.expired",
  EXPIRED: "memberList.status.expired",
  FAILED: "member.receipt.statusFailed",
  PAST_DUE: "memberList.status.expired",
  PAUSED: "member.receipt.statusPaused",
  PENDING: "memberList.status.pending",
  PENDING_PAYMENT: "memberList.status.pending",
  REJECTED: "member.receipt.statusCancelled",
};

const paymentStatusLabelKeys: Record<string, TranslationKey> = {
  CANCELLED: "member.receipt.statusCancelled",
  CREATED: "member.receipt.statusCreated",
  FAILED: "member.receipt.statusFailed",
  ISSUED: "member.receipt.statusIssued",
  PARTIALLY_REFUNDED: "member.receipt.statusRefunded",
  REFUNDED: "member.receipt.statusRefunded",
  SUCCEEDED: "member.receipt.statusSucceeded",
};

const paymentModeLabelKeys: Record<string, TranslationKey> = {
  CASH: "member.receipt.modeCash",
  ONLINE: "member.receipt.modeOnline",
  UPI: "member.receipt.modeOnline",
};

const planTypeLabelKeys: Record<string, TranslationKey> = {
  DURATION: "member.membership.typeDuration",
  HYBRID: "member.membership.typeHybrid",
  MEMBERSHIP: "member.membership.typeMembership",
  TRIAL: "member.membership.typeTrial",
};

export function membershipStatusLabel(status: string | null | undefined, t: MembershipT) {
  const normalized = (status ?? "ACTIVE").toUpperCase();
  const labelKey = membershipStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "ACTIVE");
}

export function paymentStatusLabel(status: string | null | undefined, t: MembershipT) {
  const normalized = (status ?? "CREATED").toUpperCase();
  const labelKey = paymentStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "CREATED");
}

export function paymentModeLabel(mode: string | null | undefined, t: MembershipT) {
  const normalized = (mode ?? "ONLINE").toUpperCase();
  const labelKey = paymentModeLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(mode ?? "ONLINE");
}

export function planTypeLabel(type: string | null | undefined, t: MembershipT) {
  const normalized = (type ?? "MEMBERSHIP").toUpperCase();
  const labelKey = planTypeLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(type ?? "MEMBERSHIP");
}

export function membershipStatusGuidance(
  status: string | null | undefined,
  daysLeft: number | null | undefined,
  t: MembershipT,
) {
  if (status === "PENDING_PAYMENT" || status === "PENDING") {
    return {
      title: t("member.membership.guidancePaymentPendingTitle"),
      body: t("member.membership.guidancePaymentPendingBody"),
      action: t("member.membership.guidanceCompletePayment"),
    };
  }
  if (status === "PAST_DUE") {
    return {
      title: t("member.membership.guidancePastDueTitle"),
      body: t("member.membership.guidancePastDueBody"),
      action: t("member.membership.guidancePayNow"),
    };
  }
  if (status === "EXPIRED") {
    return {
      title: t("member.membership.guidanceExpiredTitle"),
      body: t("member.membership.guidanceExpiredBody"),
      action: t("member.membership.guidanceRenewNow"),
    };
  }
  if (status === "PAUSED") {
    return {
      title: t("member.membership.guidancePausedTitle"),
      body: t("member.membership.guidancePausedBody"),
      action: t("member.membership.resumeMembership"),
    };
  }
  if (status === "CANCELLED") {
    return {
      title: t("member.membership.guidanceCancelledTitle"),
      body: t("member.membership.guidanceCancelledBody"),
      action: t("member.membership.joinDifferentGym"),
    };
  }
  if (status === "REJECTED") {
    return {
      title: t("member.membership.guidanceInactiveTitle"),
      body: t("member.membership.guidanceInactiveBody"),
      action: t("member.membership.choosePlan"),
    };
  }
  if (status === "FAILED") {
    return {
      title: t("member.membership.guidanceFailedTitle"),
      body: t("member.membership.guidanceFailedBody"),
      action: t("member.membership.guidanceTryPaymentAgain"),
    };
  }
  if (typeof daysLeft === "number" && daysLeft <= 7) {
    return {
      title: t("member.membership.guidanceRenewalWindowTitle"),
      body:
        daysLeft === 0
          ? t("member.membership.guidanceRenewTodayBody")
          : t("member.membership.guidanceDaysLeftBody", { count: daysLeft }),
      action: t("member.membership.renewMembership"),
    };
  }
  return {
    title: t("member.membership.guidanceActiveTitle"),
    body: t("member.membership.guidanceActiveBody"),
    action: t("member.membership.guidanceRenewOrChangePlan"),
  };
}

export function isAutopayEnabled(autopay?: { status?: string | null } | null) {
  return Boolean(
    autopay &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        autopay.status ?? "",
      ),
  );
}
