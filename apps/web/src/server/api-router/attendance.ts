import type { NextRequest } from "next/server";
import { attendanceScanSchema, getQrSigningSecret, publicUserEmail } from "@zook/core";
import {
  createSignedQrToken,
  decideAttendanceStatus,
  encodeQrPayload,
  evaluateOperatingHours,
  requireManualOverrideReason,
  validateAttendanceScan,
  validateSignedQrToken,
} from "@zook/core/services";
import { prisma } from "@zook/db";
import {
  getRequestContext,
  requireAuth,
  requireOrgAnyPermission,
  requireOrgPermission,
} from "../access";
import { privateUserHandle } from "../private-user-handle";
import { writeAuditLog } from "../audit";
import {
  ApiRouteError,
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "../errors";
import { assertRateLimit } from "../rate-limit";
import { fail, ok, readJson } from "../response";
import { assertMinorConsentGranted } from "../minor-gates";
import {
  getOrganizationAttendanceToday,
  getOrganizationPendingAttendance,
} from "../domains/attendance/read-models";
import { invalidateOrganizationDashboardCache } from "../domains/overview/read-models";
import {
  applyAttendanceUsage,
  assertBranchAccessForContext,
  assertOrgUser,
  attendanceCheckoutSchema,
  attendanceRejectSchema,
  attendanceWithEntryCode,
  awardEngagementBadges,
  checkInCodeForQrNonce,
  clean,
  closeAttendanceSession,
  createDirectNotification,
  enrichAttendanceRecords,
  entryCodeForAttendanceId,
  listOrganizationAttendancePage,
  manualAttendanceSchema,
  normalizeCheckInCode,
  operationalDateKey,
  pathMatches,
  queryBranchId,
  receptionCodeVerifySchema,
  resolveOrgBranch,
  serializeUserForClient,
  toMembershipPlanInput,
  type EngagementBadgePayload,
} from "./core";

export async function handleAttendance(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["ATTENDANCE_APPROVE", "MEMBERS_VIEW"]);
    return ok(await listOrganizationAttendancePage(orgId, request));
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "qr-token"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_QR_DISPLAY");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const branch = await resolveOrgBranch(orgId, branchId);
    const payload = createSignedQrToken({
      orgId,
      branchId: branch.id,
      secret: getQrSigningSecret(),
    });
    await prisma.attendanceQrToken.create({
      data: {
        orgId,
        branchId: branch.id,
        nonce: payload.nonce,
        issuedAt: new Date(payload.timestamp),
        expiresAt: new Date(payload.expiry),
        signature: payload.signature,
        createdById: userId,
      },
    });
    return ok({
      qrPayload: encodeQrPayload(payload),
      checkInCode: checkInCodeForQrNonce(payload.nonce),
      expiresAt: new Date(payload.expiry),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "dev-scan"])) {
    const appEnv = (process.env.APP_ENV ?? process.env.ENV_PROFILE ?? "local").toLowerCase();
    if (appEnv !== "local" || process.env.NODE_ENV === "production") {
      throw forbiddenError("Test check-in is only available in development.");
    }
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = ctx.orgId;
    if (!orgId) {
      throw validationError("Select a gym before trying a test check-in.");
    }
    const branch = await resolveOrgBranch(orgId);
    const dateKey = operationalDateKey();
    const openSession = await prisma.attendanceRecord.findFirst({
      where: {
        orgId,
        branchId: branch.id,
        userId,
        checkedOutAt: null,
        status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
      },
      orderBy: { checkedInAt: "desc" },
    });
    if (openSession) {
      const checkedOutRecord = await closeAttendanceSession(openSession, "qr_scan");
      await invalidateOrganizationDashboardCache(orgId, { branchId: branch.id });
      await writeAuditLog({
        request,
        orgId,
        actorUserId: userId,
        action: "attendance.dev_checkout",
        entityType: "AttendanceRecord",
        entityId: checkedOutRecord.id,
        metadata: { source: "local_dev_scan" },
      });
      return ok({
        attendance: {
          ...attendanceWithEntryCode(checkedOutRecord),
          checkedInAt: checkedOutRecord.checkedInAt,
          checkedOutAt: checkedOutRecord.checkedOutAt,
          durationSeconds: checkedOutRecord.durationSeconds,
          checkoutReason: checkedOutRecord.checkoutReason,
          branchName: branch.name,
          planName: "Test check-in",
        },
        status: checkedOutRecord.status,
        action: "checkout",
        checkedOut: true,
        duplicate: false,
        suspiciousFlags: [],
        newBadges: [],
      });
    }
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        dateKey,
        status: "APPROVED",
        source: "MANUAL",
        suspiciousFlags: ["local_dev_scan"],
      },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: branch.id });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.dev_scan",
      entityType: "AttendanceRecord",
      entityId: record.id,
      metadata: { source: "local_dev_scan" },
    });
    const newBadges = await awardEngagementBadges({ orgId, userId });
    return ok({
      attendance: {
        ...attendanceWithEntryCode(record),
        checkedInAt: record.checkedInAt,
        branchName: branch.name,
        planName: "Test check-in",
      },
      status: record.status,
      action: "checkin",
      duplicate: false,
      suspiciousFlags: [],
      newBadges,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["attendance", "scan"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = attendanceScanSchema.parse(await readJson(request));
    await assertRateLimit(
      "qrScanByActor",
      `${userId}:${body.deviceId ?? "unknown-device"}`,
      "Too many attendance scans. Please wait before trying again.",
    );
    const now = new Date();
    const decoded = await (async () => {
      try {
        if (body.qrPayload) {
          return validateSignedQrToken({
            encoded: body.qrPayload,
            secret: getQrSigningSecret(),
            now,
          });
        }
        const normalizedCode = normalizeCheckInCode(body.checkInCode ?? "");
        if (!normalizedCode) {
          throw validationError("Enter the check-in code as two letters and four digits.");
        }
        await assertRateLimit(
          "qrScanByToken",
          `code:${normalizedCode}`,
          "Too many code attempts. Please wait before trying again.",
        );
        const activeTokens = await prisma.attendanceQrToken.findMany({
          where: { expiresAt: { gt: now } },
          orderBy: { issuedAt: "desc" },
          take: 500,
        });
        const matches = activeTokens.filter(
          (token) => checkInCodeForQrNonce(token.nonce) === normalizedCode,
        );
        if (matches.length !== 1) {
          throw validationError(
            matches.length > 1
              ? "This check-in code matched more than one active branch. Please scan the QR."
              : "Check-in code is invalid or expired.",
          );
        }
        const token = matches[0]!;
        return validateSignedQrToken({
          encoded: encodeQrPayload({
            orgId: token.orgId,
            branchId: token.branchId,
            timestamp: token.issuedAt.getTime(),
            nonce: token.nonce,
            expiry: token.expiresAt.getTime(),
            signature: token.signature,
          }),
          secret: getQrSigningSecret(),
          now,
        });
      } catch (error) {
        if (error instanceof ApiRouteError) {
          throw error;
        }
        throw validationError("QR token is invalid or expired.");
      }
    })();
    await assertRateLimit(
      "qrScanByToken",
      decoded.nonce,
      "This QR code has been scanned too many times. Ask reception to refresh it.",
    );
    const qrToken = await prisma.attendanceQrToken.findUnique({ where: { nonce: decoded.nonce } });
    if (
      !qrToken ||
      qrToken.orgId !== decoded.orgId ||
      qrToken.branchId !== decoded.branchId ||
      qrToken.signature !== decoded.signature ||
      qrToken.expiresAt <= now
    ) {
      throw validationError("QR token is invalid or expired.");
    }
    const scanReservation = await prisma.attendanceQrToken.updateMany({
      where: { nonce: decoded.nonce, scanCount: { lt: 200 } },
      data: { scanCount: { increment: 1 }, lastScannedAt: now },
    });
    if (scanReservation.count !== 1) {
      throw validationError(
        "This QR code has expired due to scan volume. Ask reception to refresh it.",
      );
    }
    const [
      org,
      memberProfile,
      scanUser,
      subscription,
      expiredSubscription,
      openCheckIn,
      todayCheckIn,
      branch,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: decoded.orgId } }),
      prisma.memberProfile.findUnique({
        where: { orgId_userId: { orgId: decoded.orgId, userId } },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.memberSubscription.findFirst({
        where: { orgId: decoded.orgId, memberUserId: userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberSubscription.findFirst({
        where: { orgId: decoded.orgId, memberUserId: userId, status: "EXPIRED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.attendanceRecord.findFirst({
        where: {
          orgId: decoded.orgId,
          userId,
          checkedOutAt: null,
          status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
        },
        orderBy: { checkedInAt: "desc" },
      }),
      prisma.attendanceRecord.findFirst({
        where: {
          orgId: decoded.orgId,
          userId,
          dateKey: operationalDateKey(now),
          status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
        },
        select: { id: true },
        orderBy: { checkedInAt: "desc" },
      }),
      prisma.branch.findUnique({
        where: { id: decoded.branchId },
        select: { id: true, name: true, operatingHours: true },
      }),
    ]);
    const plan = subscription
      ? await prisma.membershipPlan.findUnique({
          where: { id: subscription.planId },
        })
      : null;
    if (!org) {
      return fail("GYM_NOT_FOUND", "Gym not found", 404);
    }
    if (!branch) {
      return fail("BRANCH_NOT_FOUND", "Branch not found", 404);
    }
    if (openCheckIn) {
      if (openCheckIn.branchId !== decoded.branchId) {
        const activeBranch = await prisma.branch.findUnique({
          where: { id: openCheckIn.branchId },
          select: { name: true },
        });
        return fail(
          "CHECKOUT_BRANCH_MISMATCH",
          `You are checked in at ${activeBranch?.name ?? "another branch"}. Scan that branch QR or stop the session from Home.`,
          409,
        );
      }
      const checkedOutRecord = await closeAttendanceSession(openCheckIn, "qr_scan", now);
      await invalidateOrganizationDashboardCache(decoded.orgId, { branchId: decoded.branchId });
      await writeAuditLog({
        request,
        orgId: decoded.orgId,
        actorUserId: userId,
        action: "attendance.qr_checkout",
        entityType: "AttendanceRecord",
        entityId: checkedOutRecord.id,
        metadata: { branchId: decoded.branchId, qrTokenId: decoded.nonce },
      });
      return ok({
        attendance: {
          ...attendanceWithEntryCode(checkedOutRecord),
          checkedInAt: checkedOutRecord.checkedInAt,
          checkedOutAt: checkedOutRecord.checkedOutAt,
          durationSeconds: checkedOutRecord.durationSeconds,
          checkoutReason: checkedOutRecord.checkoutReason,
          branchName: branch.name,
          planName: plan?.name ?? null,
        },
        status: checkedOutRecord.status,
        action: "checkout",
        checkedOut: true,
        duplicate: false,
        suspiciousFlags: [],
        warnings: [],
        newBadges: [],
      });
    }
    if (!subscription) {
      if (expiredSubscription) {
        return fail("MEMBERSHIP_EXPIRED", "Membership expired. Renew before checking in.", 400);
      }
      return fail("NO_ACTIVE_MEMBERSHIP", "No active membership", 400);
    }
    const branchHours = evaluateOperatingHours({ operatingHours: branch.operatingHours, now });
    if (!branchHours.open) {
      return fail(
        "BRANCH_CLOSED",
        "This branch is closed right now. Ask reception for manual check-in.",
        400,
      );
    }
    assertMinorConsentGranted({
      isMinor: Boolean(scanUser?.isMinor),
      guardianPending: Boolean(scanUser?.guardianPending),
      action: "attendance check-in",
    });
    const hasProfilePhoto = Boolean(memberProfile?.profilePhotoUrl || scanUser?.profilePhotoUrl);
    if (!plan) return fail("PLAN_NOT_FOUND", "Plan not found", 400);
    const validation = validateAttendanceScan({
      subscription: clean({
        id: subscription.id,
        orgId: subscription.orgId,
        branchId: subscription.branchId,
        memberUserId: subscription.memberUserId,
        planId: subscription.planId,
        status: subscription.status,
        startsAt: subscription.startsAt ?? undefined,
        endsAt: subscription.endsAt ?? undefined,
        remainingVisits: subscription.remainingVisits ?? undefined,
      }),
      plan: toMembershipPlanInput(plan),
      orgStatus: org.status,
      hasProfilePhoto,
      alreadyCheckedInToday: false,
      wrongBranch: false,
      multiEntryConsumes: org.multiEntryConsumes,
      now,
    });
    if (!validation.allowed) {
      const message =
        validation.reason === "already_checked_in"
          ? "Already checked in. Check out before checking in again."
          : (validation.reason ?? "Attendance blocked");
      return fail(
        validation.reason?.toUpperCase() ?? "ATTENDANCE_BLOCKED",
        message,
        validation.reason === "already_checked_in" ? 409 : 400,
      );
    }
    const status = validation.suspiciousFlags.length
      ? decideAttendanceStatus({ mode: "AUTOMATIC", suspiciousFlags: validation.suspiciousFlags })
      : "APPROVED";
    const record = await prisma.attendanceRecord.create({
      data: clean({
        orgId: decoded.orgId,
        branchId: decoded.branchId,
        userId,
        subscriptionId: subscription.id,
        dateKey: operationalDateKey(now),
        status,
        source: "QR_SCAN",
        qrTokenId: decoded.nonce,
        suspiciousFlags: validation.suspiciousFlags,
        deviceId: body.deviceId,
      }),
    });
    await invalidateOrganizationDashboardCache(decoded.orgId, { branchId: decoded.branchId });
    const newBadges =
      status === "APPROVED"
        ? await (async () => {
            await applyAttendanceUsage({
              orgId: decoded.orgId,
              subscription,
              plan,
              recordId: record.id,
              alreadyCheckedInToday: Boolean(todayCheckIn),
              multiEntryConsumes: org.multiEntryConsumes,
            });
            return awardEngagementBadges({ orgId: decoded.orgId, userId });
          })()
        : [];
    return ok({
      attendance: {
        ...attendanceWithEntryCode(record),
        checkedInAt: record.checkedInAt,
        branchName: branch?.name ?? null,
        planName: plan.name,
      },
      status,
      action: "checkin",
      duplicate: false,
      suspiciousFlags: validation.suspiciousFlags,
      warnings: validation.warnings,
      newBadges,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "reception", "verify-code"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    if (!ctx.isPlatformAdmin && (ctx.orgId !== orgId || !ctx.roles.length)) {
      throw forbiddenError("No organization access");
    }
    if (
      !ctx.isPlatformAdmin &&
      !ctx.permissions.includes("ATTENDANCE_APPROVE") &&
      !ctx.permissions.includes("SHOP_FULFILL_ORDER")
    ) {
      throw forbiddenError("Permission denied: reception code verification");
    }
    const body = receptionCodeVerifySchema.parse(await readJson(request));
    const code = body.code.toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [attendanceRecords, pickupCode] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { orgId, checkedInAt: { gte: today } },
        orderBy: { checkedInAt: "desc" },
        take: 150,
      }),
      prisma.pickupCode.findFirst({ where: { orgId, code } }),
    ]);
    const attendance = attendanceRecords.find(
      (record) => entryCodeForAttendanceId(record.id) === code,
    );
    if (attendance) {
      const [user, branch] = await Promise.all([
        prisma.user.findUnique({ where: { id: attendance.userId } }),
        prisma.branch.findUnique({ where: { id: attendance.branchId }, select: { name: true } }),
      ]);
      return ok({
        match: {
          type: "attendance",
          valid: attendance.status === "APPROVED" || attendance.status === "PENDING_APPROVAL",
          record: { ...attendanceWithEntryCode(attendance), branchName: branch?.name ?? null },
          user: user
            ? {
                id: user.id,
                name: user.name,
                privateHandle: privateUserHandle(user.id),
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
                profilePhotoUrl: user.profilePhotoUrl,
              }
            : null,
        },
      });
    }
    if (pickupCode) {
      const order = await prisma.shopOrder.findFirst({ where: { id: pickupCode.orderId, orgId } });
      const user = order ? await prisma.user.findUnique({ where: { id: order.userId } }) : null;
      return ok({
        match: {
          type: "pickup",
          valid: pickupCode.status === "READY_FOR_PICKUP",
          pickupCode,
          order,
          user: user
            ? {
                id: user.id,
                name: user.name,
                privateHandle: privateUserHandle(user.id),
                email: publicUserEmail(user.email) ?? "",
                phone: user.phone,
                profilePhotoUrl: user.profilePhotoUrl,
              }
            : null,
        },
      });
    }
    return ok({ match: null });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "live"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const records = await prisma.attendanceRecord.findMany({
      where: {
        orgId,
        status: { in: ["PENDING_APPROVAL", "FLAGGED"] },
        ...(branchId ? { branchId } : {}),
      },
      take: 40,
      orderBy: { checkedInAt: "desc" },
    });
    const [users, profiles, subscriptions, plans, branches] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: records.map((record) => record.userId) } } }),
      prisma.memberProfile.findMany({
        where: { orgId, userId: { in: records.map((record) => record.userId) } },
      }),
      prisma.memberSubscription.findMany({
        where: {
          id: { in: records.map((record) => record.subscriptionId).filter(Boolean) as string[] },
        },
      }),
      prisma.membershipPlan.findMany({
        where: {
          id: {
            in: (
              await prisma.memberSubscription.findMany({
                where: {
                  id: {
                    in: records.map((record) => record.subscriptionId).filter(Boolean) as string[],
                  },
                },
                select: { planId: true },
              })
            ).map((subscription) => subscription.planId),
          },
        },
      }),
      prisma.branch.findMany({
        where: { id: { in: [...new Set(records.map((record) => record.branchId))] } },
        select: { id: true, name: true },
      }),
    ]);
    const branchNamesById = new Map(branches.map((branch) => [branch.id, branch.name]));
    return ok({
      records: records.map((record) => {
        const user = users.find((candidate) => candidate.id === record.userId) ?? null;
        const profile = profiles.find((candidate) => candidate.userId === record.userId) ?? null;
        const subscription =
          subscriptions.find((candidate) => candidate.id === record.subscriptionId) ?? null;
        const plan = subscription
          ? (plans.find((candidate) => candidate.id === subscription.planId) ?? null)
          : null;
        return {
          ...record,
          entryCode: entryCodeForAttendanceId(record.id),
          branchName: branchNamesById.get(record.branchId) ?? null,
          user: user ? serializeUserForClient(user) : null,
          profile,
          subscription,
          plan,
        };
      }),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "today"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ records: await getOrganizationAttendanceToday(orgId, clean({ branchId })) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "attendance", "pending"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({ records: await getOrganizationPendingAttendance(orgId, clean({ branchId })) });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "checkout"])
  ) {
    const orgId = path[1]!;
    const attendanceRecordId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, [
      "ATTENDANCE_APPROVE",
      "ATTENDANCE_MANUAL_OVERRIDE",
    ]);
    const body = attendanceCheckoutSchema.parse(await readJson(request));
    const record = await prisma.attendanceRecord.findFirst({
      where: { id: attendanceRecordId, orgId },
    });
    if (!record) {
      throw notFoundError("Attendance record not found");
    }
    await assertBranchAccessForContext(ctx, orgId, record.branchId);
    if (record.status === "REJECTED") {
      throw conflictError("Rejected attendance records cannot be checked out.");
    }
    const openRecords = await prisma.attendanceRecord.findMany({
      where: {
        orgId,
        userId: record.userId,
        branchId: record.branchId,
        checkedOutAt: null,
        status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
      },
      orderBy: { checkedInAt: "desc" },
    });
    const recordsToClose = openRecords.some((openRecord) => openRecord.id === record.id)
      ? openRecords
      : [record, ...openRecords];
    const checkedOutRecords = await Promise.all(
      recordsToClose.map((openRecord) => closeAttendanceSession(openRecord, body.reason)),
    );
    const checkedOutRecord =
      checkedOutRecords.find((candidate) => candidate.id === record.id) ?? checkedOutRecords[0]!;
    await invalidateOrganizationDashboardCache(orgId, { branchId: record.branchId });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.desk_checked_out",
      entityType: "AttendanceRecord",
      entityId: record.id,
      metadata: clean({
        memberUserId: record.userId,
        branchId: record.branchId,
        reason: body.reason,
        closedRecordIds: recordsToClose.map((openRecord) => openRecord.id),
        latitude: body.latitude,
        longitude: body.longitude,
      }),
    });
    const [attendance] = await enrichAttendanceRecords([checkedOutRecord]);
    return ok({
      attendance,
      action: record.checkedOutAt ? "already_checked_out" : "checkout",
      checkedOut: true,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "approve"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingRecord.branchId);
    if (existingRecord.status === "REJECTED") {
      throw conflictError("Rejected attendance records cannot be approved.");
    }
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
    });
    let newBadges: EngagementBadgePayload[] = [];
    if (record.subscriptionId) {
      const subscription = await prisma.memberSubscription.findUnique({
        where: { id: record.subscriptionId },
      });
      const plan = subscription
        ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } })
        : null;
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (subscription && plan && org) {
        await applyAttendanceUsage({
          orgId,
          subscription,
          plan,
          recordId: record.id,
          multiEntryConsumes: org.multiEntryConsumes,
        });
        newBadges = await awardEngagementBadges({ orgId, userId: record.userId });
      }
    }
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Check-in approved",
      body: "Your attendance has been approved.",
      audience: "selected_member",
      userIds: [record.userId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.approved",
      entityType: "attendance_record",
      entityId: record.id,
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: record.branchId });
    return ok({
      record,
      newBadges,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "attendance", /.+/, "reject"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");
    const body = attendanceRejectSchema.parse(await readJson(request));
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingRecord) {
      throw notFoundError("Attendance record not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingRecord.branchId);
    const record = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        status: "REJECTED",
        rejectedById: userId,
        rejectedAt: new Date(),
        rejectionReason: body.reason,
      },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Check-in rejected",
      body: body.reason,
      audience: "selected_member",
      userIds: [record.userId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.rejected",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { reason: body.reason },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: record.branchId });
    return ok({ record });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "attendance", "manual"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ATTENDANCE_MANUAL_OVERRIDE");
    const body = manualAttendanceSchema.parse(await readJson(request));
    requireManualOverrideReason(body.reason);
    await assertOrgUser({ orgId, userId: body.memberUserId, role: "MEMBER" });
    const branchId = await assertBranchAccessForContext(ctx, orgId, body.branchId);
    const branch = await resolveOrgBranch(orgId, branchId);
    const memberUser = await prisma.user.findUniqueOrThrow({ where: { id: body.memberUserId } });
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        orgId,
        branchId: branch.id,
        userId: body.memberUserId,
        checkedOutAt: null,
        status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
      },
      orderBy: { checkedInAt: "desc" },
    });
    if (existing) {
      return fail(
        "ALREADY_CHECKED_IN",
        "Already checked in. Check out before checking in again.",
        409,
      );
    }
    assertMinorConsentGranted({
      isMinor: memberUser.isMinor,
      guardianPending: memberUser.guardianPending,
      action: "manual attendance override",
    });
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId,
        branchId: branch.id,
        userId: body.memberUserId,
        dateKey: operationalDateKey(),
        status: "APPROVED",
        source: "MANUAL",
        approvedById: userId,
        approvedAt: new Date(),
        suspiciousFlags: ["manual_override"],
      },
    });
    await prisma.attendanceOverride.create({
      data: clean({
        orgId,
        attendanceRecordId: record.id,
        userId: body.memberUserId,
        reason: body.reason,
        notes: body.notes,
        createdById: userId,
      }),
    });
    const subscription = await prisma.memberSubscription.findFirst({
      where: { orgId, memberUserId: body.memberUserId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    const plan = subscription
      ? await prisma.membershipPlan.findUnique({ where: { id: subscription.planId } })
      : null;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (subscription && plan && org) {
      await applyAttendanceUsage({
        orgId,
        subscription,
        plan,
        recordId: record.id,
        multiEntryConsumes: org.multiEntryConsumes,
      });
    }
    const newBadges = await awardEngagementBadges({ orgId, userId: body.memberUserId });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Manual attendance recorded",
      body: `Attendance was recorded manually: ${body.reason}.`,
      audience: "selected_member",
      userIds: [body.memberUserId],
      metadata: { attendanceRecordId: record.id },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "attendance.manual_override",
      entityType: "attendance_record",
      entityId: record.id,
      metadata: { memberUserId: body.memberUserId, reason: body.reason },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: record.branchId });
    return ok({ record, newBadges });
  }
  return undefined;
}
