import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AttendanceMode, AttendanceStatus, MemberSubscription, MembershipPlan, OrganizationStatus } from "../types";
import { evaluateSubscription } from "./membership-service";

type BranchDayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type BranchDayHours = { closed: true } | { open: string; close: string };

const branchDayKeys: BranchDayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayToBranchDay: Record<string, BranchDayKey> = {
  sun: "sun",
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
};

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
  const expected = Buffer.from(signature);
  const received = Buffer.from(payload.signature ?? "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
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

function parseHourMinute(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function readDayHours(value: unknown): BranchDayHours | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const day = value as Record<string, unknown>;
  if (day.closed === true) {
    return { closed: true };
  }
  if (parseHourMinute(day.open) == null || parseHourMinute(day.close) == null) {
    return null;
  }
  return { open: String(day.open), close: String(day.close) };
}

function localBranchDay(now: Date, timeZone: string): { dayKey: BranchDayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.slice(0, 3).toLowerCase();
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const fallbackDay = branchDayKeys[now.getUTCDay()] ?? "sun";
  return {
    dayKey: weekdayToBranchDay[weekday ?? ""] ?? fallbackDay,
    minutes: hour * 60 + minute,
  };
}

function isWithinTimeWindow(current: number, open: number, close: number): boolean {
  if (open === close) {
    return true;
  }
  if (open < close) {
    return current >= open && current < close;
  }
  return current >= open || current < close;
}

function previousBranchDay(dayKey: BranchDayKey): BranchDayKey {
  const index = branchDayKeys.indexOf(dayKey);
  return branchDayKeys[(index + branchDayKeys.length - 1) % branchDayKeys.length] ?? "sun";
}

export function evaluateOperatingHours(input: {
  operatingHours?: unknown;
  now?: Date;
  timeZone?: string;
}): { open: boolean; reason?: "branch_closed"; dayKey?: BranchDayKey } {
  const { operatingHours, now = new Date(), timeZone = "Asia/Kolkata" } = input;
  if (!operatingHours || typeof operatingHours !== "object") {
    return { open: true };
  }
  const { dayKey, minutes } = localBranchDay(now, timeZone);
  const hoursByDay = operatingHours as Partial<Record<BranchDayKey, unknown>>;
  const dayHours = readDayHours(hoursByDay[dayKey]);
  const previousHours = readDayHours(hoursByDay[previousBranchDay(dayKey)]);
  if (previousHours && !("closed" in previousHours)) {
    const previousOpen = parseHourMinute(previousHours.open);
    const previousClose = parseHourMinute(previousHours.close);
    if (
      previousOpen != null &&
      previousClose != null &&
      previousOpen > previousClose &&
      minutes < previousClose
    ) {
      return { open: true, dayKey };
    }
  }
  if (!dayHours) {
    return { open: true, dayKey };
  }
  if ("closed" in dayHours) {
    return { open: false, reason: "branch_closed", dayKey };
  }
  const open = parseHourMinute(dayHours.open);
  const close = parseHourMinute(dayHours.close);
  if (open == null || close == null) {
    return { open: true, dayKey };
  }
  return isWithinTimeWindow(minutes, open, close)
    ? { open: true, dayKey }
    : { open: false, reason: "branch_closed", dayKey };
}

export function validateAttendanceScan(input: {
  subscription: MemberSubscription;
  plan: MembershipPlan;
  orgStatus: OrganizationStatus;
  hasProfilePhoto: boolean;
  alreadyCheckedInToday: boolean;
  wrongBranch?: boolean;
  multiEntryConsumes?: boolean;
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
  const evaluation = evaluateSubscription(input.subscription, input.plan, {
    ...(input.now ? { now: input.now } : {}),
    orgStatus: input.orgStatus,
    hasProfilePhoto: input.hasProfilePhoto
  });
  if (
    !evaluation.valid &&
    evaluation.reason === "visit_pack_empty" &&
    input.alreadyCheckedInToday &&
    !input.multiEntryConsumes
  ) {
    return { allowed: true, suspiciousFlags, warnings: evaluation.warnings ?? [] };
  }
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
