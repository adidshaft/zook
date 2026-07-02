import { zookDemoFixtures } from "@zook/core/demo-fixtures";

import {
  clearDemoCheckIn,
  getDemoActiveCheckIn,
  startDemoCheckIn,
} from "../../demo-member-home";

let demoBranchQrMode: "ROLLING" | "STATIC" = "ROLLING";
let demoStaticQrToken: { qrPayload: string; checkInCode: string; expiresAt: string } | null = null;

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

export function attendanceDemoResponse(
  pathname: string,
  method: string,
  init: { body?: unknown },
  helpers: {
    activeOrg: () => { id?: string; name?: string | null } | undefined;
    nowIso: () => string;
  },
) {
  const checkoutMatch = pathname.match(/^\/me\/attendance\/([^/]+)\/checkout$/);
  if (checkoutMatch && method === "POST") {
    const active = getDemoActiveCheckIn();
    clearDemoCheckIn();
    return {
      attendance: {
        ...(active ?? {}),
        id: checkoutMatch[1],
        checkedOutAt: helpers.nowIso(),
        checkoutReason: (init.body as { reason?: string } | undefined)?.reason ?? "manual",
        status: "APPROVED",
      },
    };
  }

  if (pathname === "/me/attendance") {
    return { attendance: zookDemoFixtures.attendanceAttempts };
  }

  if (pathname.match(/^\/me\/attendance\/[^/]+$/)) {
    const attendanceRecordId = pathname.split("/").at(-1);
    const rejectedAttendance =
      attendanceRecordId === "attendance-rejected"
        ? {
            ...zookDemoFixtures.attendanceAttempts[1],
            id: "attendance-rejected",
            status: "REJECTED",
            entryCode: "RJ-2048",
            reason: "Desk rejected this scan after branch review.",
            auditTrail: ["QR token valid", "Desk review required", "Rejected by reception"],
          }
        : undefined;
    const attendance =
      rejectedAttendance ??
      zookDemoFixtures.attendanceAttempts.find((record) => record.id === attendanceRecordId) ??
      zookDemoFixtures.attendanceAttempts[0];
    return { attendance };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/qr-token$/)) {
    if (demoBranchQrMode === "STATIC" && demoStaticQrToken) {
      return {
        ...demoStaticQrToken,
        branchId: "branch-default",
        isStatic: true,
        qrMode: "STATIC",
      };
    }
    const nonce = Math.random().toString(36).slice(2, 14);
    const letters = String.fromCharCode(
      65 + Math.floor(Math.random() * 26),
      65 + Math.floor(Math.random() * 26),
    );
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const tokenPayload = {
      qrPayload: `demo.${helpers.activeOrg()?.id ?? "org-demo"}.${nonce}`,
      checkInCode: `${letters}-${digits}`,
      expiresAt: new Date(
        Date.now() + (demoBranchQrMode === "STATIC" ? 30 * 24 * 60 * 60 * 1000 : 180000),
      ).toISOString(),
    };
    if (demoBranchQrMode === "STATIC") {
      demoStaticQrToken = tokenPayload;
    }
    return {
      ...tokenPayload,
      branchId: "branch-default",
      isStatic: demoBranchQrMode === "STATIC",
      qrMode: demoBranchQrMode,
    };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/qr-token\/regenerate$/)) {
    demoStaticQrToken = null;
    return { ok: true };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/branches\/[^/]+\/qr-settings$/) && method === "PATCH") {
    const body = demoBody(init);
    demoBranchQrMode =
      String(body.qrMode ?? "ROLLING").toUpperCase() === "STATIC" ? "STATIC" : "ROLLING";
    demoStaticQrToken = null;
    return {
      branch: {
        id: "branch-default",
        qrMode: demoBranchQrMode,
        staticQrExpiryDays: Number(body.staticQrExpiryDays ?? 30),
      },
    };
  }

  if (pathname === "/attendance/scan" || pathname === "/attendance/dev-scan") {
    const existing = getDemoActiveCheckIn();
    if (existing) {
      return {
        attendance: existing,
        status: existing.status,
        duplicate: true,
        suspiciousFlags: [],
      };
    }
    const checkIn = startDemoCheckIn(helpers.activeOrg()?.name ?? null);
    return {
      attendance: checkIn,
      status: checkIn.status,
      duplicate: false,
      suspiciousFlags: [],
    };
  }

  return undefined;
}
