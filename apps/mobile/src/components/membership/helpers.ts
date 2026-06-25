import type { TranslationKey } from "@/lib/i18n";

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
  if (status === "REJECTED" || status === "CANCELLED") {
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
