import type { OrgMemberRecord, ReceptionQueueRecord } from "../../lib/domains/shared/types";
import { formatInr, rupeesToPaise } from "../../lib/formatting";

const ATTENDANCE_FLAG_PRIORITY: Record<string, number> = {
  EXPIRED_MEMBERSHIP: 0,
  OUT_OF_BRANCH: 1,
  STALE_TOKEN: 2,
  RAPID_REPEAT: 3,
  EARLY_CHECKIN: 4,
};

export function attendanceReviewPriority(attempt: ReceptionQueueRecord) {
  if (attempt.status === "FLAGGED") {
    const flags = Array.isArray(attempt.suspiciousFlags) ? attempt.suspiciousFlags : [];
    if (!flags.length) return 2;
    return Math.min(...flags.map((flag) => ATTENDANCE_FLAG_PRIORITY[flag] ?? 2));
  }
  if (attempt.status === "PENDING_APPROVAL") return 5;
  return 9;
}

export function attendanceReviewTimestamp(attempt: ReceptionQueueRecord) {
  const timestamp = new Date(attempt.checkedInAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortReceptionApprovalQueue(records: ReceptionQueueRecord[]) {
  return [...records].sort((left, right) => {
    const priority = attendanceReviewPriority(left) - attendanceReviewPriority(right);
    return priority || attendanceReviewTimestamp(left) - attendanceReviewTimestamp(right);
  });
}

export function resolveDeskPaymentState({
  amount,
  memberId,
  membershipId,
  paymentReason,
}: {
  amount: string;
  memberId?: string | null;
  membershipId?: string | null;
  paymentReason: string;
}) {
  const amountPaise = rupeesToPaise(amount);
  const dueAmount = amountPaise ?? 0;
  const canRecordPayment =
    amountPaise !== null &&
    amountPaise > 0 &&
    paymentReason.trim().length > 0 &&
    Boolean(memberId) &&
    Boolean(membershipId);
  const amountInvalid = amount.trim().length > 0 && (amountPaise === null || amountPaise <= 0);

  return {
    amountInvalid,
    amountPaise,
    canRecordPayment,
    dueAmount,
  };
}

export function filterReceptionMembers(records: OrgMemberRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return records;
  return records.filter((member) => {
    const name = member.user?.name.toLowerCase() ?? "";
    const email = member.user?.email.toLowerCase() ?? "";
    const phone = member.user?.phone?.toLowerCase() ?? "";
    return (
      name.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      phone.includes(normalizedQuery)
    );
  });
}

export function receptionMemberResultLimit(query: string) {
  return query.trim().length ? 25 : 10;
}

export function selectReceptionMemberRecord(
  records: OrgMemberRecord[],
  selectedMemberId?: string | null,
  initialMemberId?: string | null,
) {
  const selected =
    records.find(
      (record) =>
        record.profile.userId === selectedMemberId || record.user?.id === selectedMemberId,
    ) ?? null;
  return selected ?? (initialMemberId ? records[0] ?? null : null);
}

export function pickupCodeStatus(input: {
  order?: { status?: string | null } | null;
  pickupCode?: { status?: string | null } | null;
}) {
  return input.pickupCode?.status ?? input.order?.status ?? "READY_FOR_PICKUP";
}

export function pickupOrderTotalDetail(
  totalPaise: number | null | undefined,
  t: (key: "reception.workspace.orderTotalDetail", params: { amount: string }) => string,
) {
  return t("reception.workspace.orderTotalDetail", {
    amount: formatInr(totalPaise ?? 0),
  });
}

export function recordedPaymentMessage(
  payment: { amountPaise?: number | null; mode?: string | null },
  labels: {
    modeLabel: (mode?: string | null) => string;
    t: (key: "reception.workspace.paymentRecorded", params: { amount: string; mode: string }) => string;
  },
) {
  return labels.t("reception.workspace.paymentRecorded", {
    amount: formatInr(payment.amountPaise ?? 0),
    mode: labels.modeLabel(payment.mode),
  });
}

export function bulkAttendanceSummary(
  input: { failures: number; successes: number; total: number },
  t: (
    key:
      | "reception.workspace.bulkRecordedMany"
      | "reception.workspace.bulkRecordedOne"
      | "reception.workspace.bulkRecordedPartial",
    params?: { count?: number; failures?: number; successes?: number; total?: number },
  ) => string,
) {
  const message = input.failures
    ? t("reception.workspace.bulkRecordedPartial", input)
    : t(input.successes === 1 ? "reception.workspace.bulkRecordedOne" : "reception.workspace.bulkRecordedMany", {
        count: input.successes,
      });
  return {
    haptic: input.failures ? "warning" as const : "success" as const,
    message,
    tone: input.failures ? "amber" as const : "success" as const,
  };
}

export function paymentFailureMessage(message: string, duplicateActiveMembershipLabel: string) {
  return /already active/i.test(message) ? duplicateActiveMembershipLabel : message;
}

export function manualAttendanceFailureMessage(
  message: string,
  alreadyCheckedInLabel: string,
) {
  return /already has an attendance record/i.test(message) ? alreadyCheckedInLabel : message;
}

export type ReceptionCodeMatch = {
  type: "attendance" | "pickup";
  valid: boolean;
  record?: { status?: string | null; entryCode?: string | null } | null;
  pickupCode?: { status?: string | null; code?: string | null } | null;
  order?: { status?: string | null; totalPaise?: number | null } | null;
  user?: {
    name?: string | null;
    email?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
};

export type VerificationPresentation = {
  result: {
    detail?: string;
    message: string;
    name?: string | null;
    photoUrl?: string | null;
    tone: "success" | "danger";
    type?: "attendance" | "pickup";
  };
  toast: {
    haptic: "success" | "warning";
    message?: string;
    title?: string;
    tone: "success" | "amber";
  };
};

export function buildVerificationPresentation(
  match: ReceptionCodeMatch,
  labels: {
    attendanceStatusLabel: (status?: string | null) => string;
    memberFallback: string;
    pickupStatusLabel: (status?: string | null) => string;
    t: (
      key:
        | "reception.workspace.checkInNotValid"
        | "reception.workspace.checkInVerified"
        | "reception.workspace.entryCodeInvalidMessage"
        | "reception.workspace.notValidForEntry"
        | "reception.workspace.orderTotalDetail"
        | "reception.workspace.pickupNotReady"
        | "reception.workspace.pickupStatusTitle"
        | "reception.workspace.pickupVerified"
        | "reception.workspace.pickupVerifiedFor"
        | "reception.workspace.statusDetail"
        | "reception.workspace.verifiedName",
      params?: { amount?: string; name?: string; status?: string },
    ) => string;
  },
): VerificationPresentation {
  const name = match.user?.name ?? match.user?.email ?? labels.memberFallback;
  if (match.type === "attendance") {
    if (match.valid) {
      const status = labels.attendanceStatusLabel(match.record?.status ?? "APPROVED");
      return {
        result: {
          tone: "success",
          type: "attendance",
          name,
          photoUrl: match.user?.profilePhotoUrl,
          message: labels.t("reception.workspace.checkInVerified"),
          detail: labels.t("reception.workspace.statusDetail", { status }),
        },
        toast: {
          tone: "success",
          haptic: "success",
          message: labels.t("reception.workspace.verifiedName", { name }),
        },
      };
    }
    const message = labels.t("reception.workspace.entryCodeInvalidMessage", { name });
    return {
      result: {
        tone: "danger",
        type: "attendance",
        name,
        photoUrl: match.user?.profilePhotoUrl,
        message: labels.t("reception.workspace.checkInNotValid"),
        detail: message,
      },
      toast: {
        tone: "amber",
        haptic: "warning",
        title: labels.t("reception.workspace.notValidForEntry"),
        message: name,
      },
    };
  }

  if (match.valid) {
    return {
      result: {
        tone: "success",
        type: "pickup",
        name,
        photoUrl: match.user?.profilePhotoUrl,
        message: labels.t("reception.workspace.pickupVerified"),
        detail: pickupOrderTotalDetail(match.order?.totalPaise, labels.t),
      },
      toast: {
        tone: "success",
        haptic: "success",
        message: labels.t("reception.workspace.pickupVerifiedFor", { name }),
      },
    };
  }

  const status = labels.pickupStatusLabel(pickupCodeStatus(match));
  const message = labels.t("reception.workspace.pickupStatusTitle", { status });
  return {
    result: {
      tone: "danger",
      type: "pickup",
      name,
      photoUrl: match.user?.profilePhotoUrl,
      message: labels.t("reception.workspace.pickupNotReady"),
      detail: message,
    },
    toast: {
      tone: "amber",
      haptic: "warning",
      title: message,
      message: name,
    },
  };
}
