import { createHmac, randomBytes } from "node:crypto";
import type { AttendanceMode, AttendanceStatus, MemberSubscription, MembershipPlan, OrganizationStatus } from "../types";
import { evaluateSubscription } from "./membership-service";

export interface QrPayload {
  orgId: string;
  branchId: string;
  timestamp: number;
  nonce: string;
  expiry: number;
  signature: string;
}

export function createSignedQrToken(input: {
  orgId: string;
  branchId: string;
  secret: string;
  now?: Date;
  ttlSeconds?: number;
}): QrPayload {
  const now = input.now ?? new Date();
  const expiry = now.getTime() + (input.ttlSeconds ?? 180) * 1000;
  const nonce = randomBytes(12).toString("hex");
  const unsigned = `${input.orgId}.${input.branchId}.${now.getTime()}.${nonce}.${expiry}`;
  const signature = createHmac("sha256", input.secret).update(unsigned).digest("base64url");
  return { orgId: input.orgId, branchId: input.branchId, timestamp: now.getTime(), nonce, expiry, signature };
}

export function encodeQrPayload(payload: QrPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeQrPayload(encoded: string): QrPayload {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as QrPayload;
}

export function validateSignedQrToken(input: { encoded: string; secret: string; now?: Date; expectedOrgId?: string; expectedBranchId?: string }): QrPayload {
  const now = input.now ?? new Date();
  const payload = decodeQrPayload(input.encoded);
  if (payload.expiry < now.getTime()) {
    throw new Error("QR token expired");
  }
  if (input.expectedOrgId && payload.orgId !== input.expectedOrgId) {
    throw new Error("QR token wrong organization");
  }
  if (input.expectedBranchId && payload.branchId !== input.expectedBranchId) {
    throw new Error("QR token wrong branch");
  }
  const unsigned = `${payload.orgId}.${payload.branchId}.${payload.timestamp}.${payload.nonce}.${payload.expiry}`;
  const signature = createHmac("sha256", input.secret).update(unsigned).digest("base64url");
  if (signature !== payload.signature) {
    throw new Error("QR token invalid signature");
  }
  return payload;
}

export function decideAttendanceStatus(input: {
  mode: AttendanceMode;
  suspiciousFlags: string[];
}): AttendanceStatus {
  if (input.mode === "MANUAL_APPROVAL") {
    return "PENDING_APPROVAL";
  }
  if (input.mode === "AUTOMATIC") {
    return input.suspiciousFlags.length ? "FLAGGED" : "APPROVED";
  }
  return input.suspiciousFlags.length ? "PENDING_APPROVAL" : "APPROVED";
}

export function validateAttendanceScan(input: {
  subscription: MemberSubscription;
  plan: MembershipPlan;
  orgStatus: OrganizationStatus;
  hasProfilePhoto: boolean;
  alreadyCheckedInToday: boolean;
  wrongBranch?: boolean;
  failedScanCount?: number;
  now?: Date;
}): { allowed: boolean; suspiciousFlags: string[]; warnings: string[]; reason?: string } {
  const suspiciousFlags: string[] = [];
  if (input.wrongBranch) {
    suspiciousFlags.push("wrong_branch");
  }
  if ((input.failedScanCount ?? 0) >= 3) {
    suspiciousFlags.push("too_many_failed_scans");
  }
  if (input.alreadyCheckedInToday) {
    suspiciousFlags.push("duplicate_same_day");
  }
  const evaluation = evaluateSubscription(input.subscription, input.plan, {
    ...(input.now ? { now: input.now } : {}),
    orgStatus: input.orgStatus,
    hasProfilePhoto: input.hasProfilePhoto
  });
  if (!evaluation.valid) {
    return {
      allowed: false,
      suspiciousFlags,
      warnings: evaluation.warnings ?? [],
      ...(evaluation.reason ? { reason: evaluation.reason } : {})
    };
  }
  return { allowed: true, suspiciousFlags, warnings: evaluation.warnings ?? [] };
}

export function requireManualOverrideReason(reason?: string): void {
  if (!reason?.trim()) {
    throw new Error("Manual attendance override reason required");
  }
}
