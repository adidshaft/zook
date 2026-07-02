import { describe, expect, it } from "vitest";

import {
  buildVerificationPresentation,
  bulkAttendanceSummary,
  filterReceptionMembers,
  manualAttendanceFailureMessage,
  paymentFailureMessage,
  pickupCodeStatus,
  pickupOrderTotalDetail,
  receptionMemberResultLimit,
  recordedPaymentMessage,
  resolveDeskPaymentState,
  selectReceptionMemberRecord,
  sortReceptionApprovalQueue,
} from "./desk-logic";
import type { OrgMemberRecord, ReceptionQueueRecord } from "@/lib/domains/shared/types";

function queueRecord(
  id: string,
  status: ReceptionQueueRecord["status"],
  checkedInAt: string,
  suspiciousFlags: string[] = [],
): ReceptionQueueRecord {
  return {
    branchName: "Main",
    checkedInAt,
    id,
    suspiciousFlags,
    status,
  } as ReceptionQueueRecord;
}

function memberRecord(
  profileUserId: string,
  user: { id?: string; name?: string | null; email?: string | null; phone?: string | null },
): OrgMemberRecord {
  return {
    activeSubscription: null,
    profile: { userId: profileUserId },
    user,
  } as OrgMemberRecord;
}

describe("sortReceptionApprovalQueue", () => {
  it("puts high-risk flagged records before pending approvals, then by timestamp", () => {
    const records = [
      queueRecord("pending-old", "PENDING_APPROVAL", "2026-07-02T09:00:00Z"),
      queueRecord("flagged-stale", "FLAGGED", "2026-07-02T11:00:00Z", ["STALE_TOKEN"]),
      queueRecord("flagged-expired", "FLAGGED", "2026-07-02T12:00:00Z", ["EXPIRED_MEMBERSHIP"]),
      queueRecord("pending-new", "PENDING_APPROVAL", "2026-07-02T10:00:00Z"),
    ];

    expect(sortReceptionApprovalQueue(records).map((record) => record.id)).toEqual([
      "flagged-expired",
      "flagged-stale",
      "pending-old",
      "pending-new",
    ]);
  });
});

describe("resolveDeskPaymentState", () => {
  it("parses rupee input and requires member, membership, and reason", () => {
    expect(
      resolveDeskPaymentState({
        amount: "₹1,299",
        memberId: "user_1",
        membershipId: "sub_1",
        paymentReason: "Desk payment",
      }),
    ).toMatchObject({
      amountInvalid: false,
      amountPaise: 129900,
      canRecordPayment: true,
      dueAmount: 129900,
    });
  });

  it("marks empty and invalid amounts as not recordable", () => {
    expect(
      resolveDeskPaymentState({
        amount: "",
        memberId: "user_1",
        membershipId: "sub_1",
        paymentReason: "Desk payment",
      }),
    ).toMatchObject({ amountInvalid: false, amountPaise: null, canRecordPayment: false });

    expect(
      resolveDeskPaymentState({
        amount: "abc",
        memberId: "user_1",
        membershipId: "sub_1",
        paymentReason: "Desk payment",
      }),
    ).toMatchObject({ amountInvalid: true, amountPaise: null, canRecordPayment: false });
  });
});

describe("reception member helpers", () => {
  const members = [
    memberRecord("profile_1", {
      id: "user_1",
      name: "Asha Rao",
      email: "asha@example.com",
      phone: "+91 90000 00001",
    }),
    memberRecord("profile_2", {
      id: "user_2",
      name: "Kabir Khan",
      email: "kabir@example.com",
      phone: "+91 90000 00002",
    }),
  ];

  it("filters reception members by name, email, or phone", () => {
    expect(filterReceptionMembers(members, "asha").map((member) => member.profile.userId)).toEqual([
      "profile_1",
    ]);
    expect(filterReceptionMembers(members, "kabir@example").map((member) => member.profile.userId)).toEqual([
      "profile_2",
    ]);
    expect(filterReceptionMembers(members, "00001").map((member) => member.profile.userId)).toEqual([
      "profile_1",
    ]);
    expect(filterReceptionMembers(members, "")).toHaveLength(2);
  });

  it("resolves list limits and selected member fallback", () => {
    expect(receptionMemberResultLimit("")).toBe(10);
    expect(receptionMemberResultLimit("ash")).toBe(25);
    expect(selectReceptionMemberRecord(members, "user_2")?.profile.userId).toBe("profile_2");
    expect(selectReceptionMemberRecord(members, "profile_1")?.user?.id).toBe("user_1");
    expect(selectReceptionMemberRecord(members, "missing", "initial")?.profile.userId).toBe("profile_1");
    expect(selectReceptionMemberRecord(members, "missing")).toBeNull();
  });
});

describe("pickup order helpers", () => {
  it("prefers pickup-code status over order status", () => {
    expect(
      pickupCodeStatus({
        pickupCode: { status: "READY_FOR_PICKUP" },
        order: { status: "PAID" },
      }),
    ).toBe("READY_FOR_PICKUP");
    expect(pickupCodeStatus({ order: { status: "PAID" } })).toBe("PAID");
    expect(pickupCodeStatus({})).toBe("READY_FOR_PICKUP");
  });

  it("formats pickup total detail and recorded payment messages", () => {
    const totalDetail = pickupOrderTotalDetail(259900, (_key, params) => `Total ${params.amount}`);
    expect(totalDetail).toBe("Total ₹2,599");

    const paymentMessage = recordedPaymentMessage(
      { amountPaise: 129900, mode: "DIRECT_UPI" },
      {
        modeLabel: (mode) => (mode === "DIRECT_UPI" ? "UPI" : "Other"),
        t: (_key, params) => `${params.amount} via ${params.mode}`,
      },
    );
    expect(paymentMessage).toBe("₹1,299 via UPI");
  });
});

describe("desk status message helpers", () => {
  it("builds bulk attendance summary and toast tone", () => {
    const t = (key: string, params?: Record<string, number>) => `${key}:${JSON.stringify(params ?? {})}`;

    expect(bulkAttendanceSummary({ failures: 0, successes: 1, total: 1 }, t)).toEqual({
      haptic: "success",
      message: 'reception.workspace.bulkRecordedOne:{"count":1}',
      tone: "success",
    });
    expect(bulkAttendanceSummary({ failures: 2, successes: 3, total: 5 }, t)).toEqual({
      haptic: "warning",
      message: 'reception.workspace.bulkRecordedPartial:{"failures":2,"successes":3,"total":5}',
      tone: "amber",
    });
  });

  it("maps known payment and attendance conflict messages", () => {
    expect(paymentFailureMessage("Membership already active", "Already active")).toBe("Already active");
    expect(paymentFailureMessage("Gateway unavailable", "Already active")).toBe("Gateway unavailable");
    expect(
      manualAttendanceFailureMessage(
        "Member already has an attendance record today",
        "Already checked in",
      ),
    ).toBe("Already checked in");
    expect(manualAttendanceFailureMessage("Network failed", "Already checked in")).toBe("Network failed");
  });
});

describe("buildVerificationPresentation", () => {
  const labels = {
    attendanceStatusLabel: (status?: string | null) => (status === "APPROVED" ? "Approved" : "Other"),
    memberFallback: "Member",
    pickupStatusLabel: (status?: string | null) => (status === "PAID" ? "Paid" : "Ready"),
    t: (key: string, params?: { amount?: string; name?: string; status?: string }) => {
      if (key === "reception.workspace.statusDetail") return `Status ${params?.status}`;
      if (key === "reception.workspace.verifiedName") return `Verified ${params?.name}`;
      if (key === "reception.workspace.entryCodeInvalidMessage") return `${params?.name} invalid`;
      if (key === "reception.workspace.pickupVerifiedFor") return `Pickup ${params?.name}`;
      if (key === "reception.workspace.orderTotalDetail") return `Total ${params?.amount}`;
      if (key === "reception.workspace.pickupStatusTitle") return `Status ${params?.status}`;
      return key;
    },
  };

  it("builds success copy for valid attendance codes", () => {
    const presentation = buildVerificationPresentation(
      {
        type: "attendance",
        valid: true,
        record: { status: "APPROVED" },
        user: { name: "Asha" },
      },
      labels,
    );

    expect(presentation.result).toMatchObject({
      tone: "success",
      type: "attendance",
      name: "Asha",
      detail: "Status Approved",
    });
    expect(presentation.toast).toMatchObject({ tone: "success", message: "Verified Asha" });
  });

  it("builds pickup not-ready copy from pickup status", () => {
    const presentation = buildVerificationPresentation(
      {
        type: "pickup",
        valid: false,
        pickupCode: { status: "PAID" },
        user: { email: "member@example.com" },
      },
      labels,
    );

    expect(presentation.result).toMatchObject({
      tone: "danger",
      type: "pickup",
      name: "member@example.com",
      detail: "Status Paid",
    });
    expect(presentation.toast).toMatchObject({
      tone: "amber",
      title: "Status Paid",
      message: "member@example.com",
    });
  });
});
