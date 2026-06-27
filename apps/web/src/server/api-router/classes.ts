import { decideClassEnrollment, validateClassSchedule } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth, requireOrgAnyPermission } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { createDirectNotification } from "./core";
import { ok, readJson } from "../response";
import {
  assertActiveContextOrg,
  assertOrgUser,
  clean,
  jsonObject,
  pathMatches,
  queryBranchId,
  refundPaymentForActor,
  resolveOrgBranch,
  startPaymentSessionCheckout,
} from "./core";

const classInputSchema = z.object({
  branchId: z.string(),
  trainerId: z.string(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  classType: z.string().trim().min(2).max(80),
  maxCapacity: z.number().int().positive().max(500),
  pricePaise: z.number().int().min(0).max(1_000_000).optional(),
  trainerCommissionBps: z.number().int().min(0).max(10_000).optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurrenceRule: z.string().trim().max(240).optional(),
});

const classUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  classType: z.string().trim().min(2).max(80).optional(),
  maxCapacity: z.number().int().positive().max(500).optional(),
  pricePaise: z.number().int().min(0).max(1_000_000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

const classAttendanceSchema = z.object({
  status: z.enum(["PENDING", "ATTENDED", "NO_SHOW"]),
});

const classEnrollmentSchema = z.object({
  memberUserId: z.string().optional(),
});

const CLASS_REFUND_CUTOFF_HOURS = 6;

function classSettings(settings: unknown) {
  const parsed = jsonObject(settings as Prisma.JsonValue | null | undefined);
  const allowClassDropIn = parsed.allowClassDropIn === true;
  const refundCutoffHours =
    typeof parsed.classRefundCutoffHours === "number" && Number.isFinite(parsed.classRefundCutoffHours)
      ? Math.max(0, parsed.classRefundCutoffHours)
      : CLASS_REFUND_CUTOFF_HOURS;
  return { allowClassDropIn, refundCutoffHours };
}

async function assertMemberCanBookClass(orgId: string, userId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  const settings = classSettings(org?.settings);
  if (settings.allowClassDropIn) return settings;
  const activeSubscription = await prisma.memberSubscription.findFirst({
    where: {
      orgId,
      memberUserId: userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!activeSubscription) {
    throw forbiddenError("An active membership is required to book classes at this gym.");
  }
  return settings;
}

async function reservedEnrollmentCount(classId: string) {
  return prisma.classEnrollment.count({
    where: { classId, status: { in: ["confirmed", "pending_payment"] } },
  });
}

export async function handleClasses(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "classes"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const branchId = queryBranchId(request);
    if (branchId) {
      await resolveOrgBranch(orgId, branchId);
    }
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const startTime = clean({
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    });
    const classes = await prisma.class.findMany({
      where: clean({
        orgId,
        ...(branchId ? { branchId } : {}),
        ...(Object.keys(startTime).length ? { startTime } : {}),
      }),
      orderBy: { startTime: "asc" },
      take: 100,
    });
    const enrollments = classes.length
      ? await prisma.classEnrollment.findMany({
          where: { classId: { in: classes.map((entry) => entry.id) } },
        })
      : [];
    const [trainers, branches] = classes.length
      ? await Promise.all([
          prisma.user.findMany({
            where: { id: { in: Array.from(new Set(classes.map((entry) => entry.trainerId))) } },
            select: { id: true, name: true },
          }),
          prisma.branch.findMany({
            where: { id: { in: Array.from(new Set(classes.map((entry) => entry.branchId))) } },
            select: { id: true, name: true },
          }),
        ])
      : [[], []];
    const trainerNames = new Map(trainers.map((trainer) => [trainer.id, trainer.name]));
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    return ok({
      classes: classes.map((entry) => ({
        ...entry,
        enrollmentCount: enrollments.filter(
          (enrollment) => enrollment.classId === entry.id && enrollment.status === "confirmed",
        ).length,
        remainingCapacity: Math.max(
          0,
          entry.maxCapacity -
            enrollments.filter(
              (enrollment) =>
                enrollment.classId === entry.id &&
                (entry.pricePaise > 0
                  ? ["confirmed", "pending_payment"].includes(enrollment.status)
                  : enrollment.status === "confirmed"),
            ).length,
        ),
        myEnrollmentStatus:
          enrollments.find(
            (enrollment) => enrollment.classId === entry.id && enrollment.memberId === userId,
          )?.status ?? null,
        trainerName: trainerNames.get(entry.trainerId) ?? null,
        branchName: branchNames.get(entry.branchId) ?? null,
      })),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "classes", /.+/])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const branchId = queryBranchId(request);
    const classRecord = await prisma.class.findFirst({
      where: clean({ id: classId, orgId, ...(branchId ? { branchId } : {}) }),
    });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    const [enrollments, trainer, branch] = await Promise.all([
      prisma.classEnrollment.findMany({ where: { classId: classRecord.id } }),
      prisma.user.findUnique({
        where: { id: classRecord.trainerId },
        select: { id: true, name: true },
      }),
      prisma.branch.findUnique({
        where: { id: classRecord.branchId },
        select: { id: true, name: true },
      }),
    ]);
    return ok({
      class: {
        ...classRecord,
        enrollmentCount: enrollments.filter((enrollment) => enrollment.status === "confirmed")
          .length,
        remainingCapacity: Math.max(
          0,
          classRecord.maxCapacity -
            enrollments.filter((enrollment) =>
              classRecord.pricePaise > 0
                ? ["confirmed", "pending_payment"].includes(enrollment.status)
                : enrollment.status === "confirmed",
            ).length,
        ),
        myEnrollmentStatus:
          enrollments.find((enrollment) => enrollment.memberId === userId)?.status ?? null,
        trainerName: trainer?.name ?? null,
        branchName: branch?.name ?? null,
      },
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "classes"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["TRAINERS_MANAGE", "PLANS_CREATE"]);
    const body = classInputSchema.parse(await readJson(request));
    if (!ctx.permissions.includes("TRAINERS_MANAGE") && body.trainerId !== userId) {
      throw forbiddenError("Trainers can only schedule their own classes.");
    }
    const [branch] = await Promise.all([
      resolveOrgBranch(orgId, body.branchId),
      assertOrgUser({ orgId, userId: body.trainerId, role: "TRAINER" }),
    ]);
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    validateClassSchedule({ startTime, endTime, maxCapacity: body.maxCapacity });
    const classRecord = await prisma.class.create({
      data: clean({
        orgId,
        branchId: branch.id,
        trainerId: body.trainerId,
        name: body.name,
        description: body.description,
        classType: body.classType,
        maxCapacity: body.maxCapacity,
        pricePaise: body.pricePaise ?? 0,
        trainerCommissionBps: body.trainerCommissionBps ?? null,
        startTime,
        endTime,
        recurrenceRule: body.recurrenceRule,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.created",
      entityType: "class",
      entityId: classRecord.id,
      metadata: { trainerId: classRecord.trainerId, branchId: classRecord.branchId },
    });
    return ok({ class: classRecord });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "classes", /.+/])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["TRAINERS_MANAGE", "PLANS_CREATE"]);
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    if (!ctx.permissions.includes("TRAINERS_MANAGE") && classRecord.trainerId !== userId) {
      throw forbiddenError("Trainers can only edit their own classes.");
    }
    if (classRecord.status === "cancelled") {
      throw conflictError("Cancelled classes cannot be edited.");
    }
    const body = classUpdateSchema.parse(await readJson(request));
    const startTime = body.startTime ? new Date(body.startTime) : classRecord.startTime;
    const endTime = body.endTime ? new Date(body.endTime) : classRecord.endTime;
    const maxCapacity = body.maxCapacity ?? classRecord.maxCapacity;
    validateClassSchedule({ startTime, endTime, maxCapacity });
    const updated = await prisma.class.update({
      where: { id: classId },
      data: clean({
        name: body.name,
        description: body.description,
        classType: body.classType,
        maxCapacity: body.maxCapacity,
        pricePaise: body.pricePaise,
        startTime: body.startTime ? startTime : undefined,
        endTime: body.endTime || body.startTime ? endTime : undefined,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.updated",
      entityType: "class",
      entityId: classId,
      metadata: { changes: body },
    });
    return ok({ class: updated });
  }
  if (
    (request.method === "DELETE" || request.method === "POST") &&
    pathMatches(path, ["orgs", /.+/, "classes", /.+/, "cancel"])
  ) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["TRAINERS_MANAGE", "PLANS_CREATE"]);
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    if (!ctx.permissions.includes("TRAINERS_MANAGE") && classRecord.trainerId !== userId) {
      throw forbiddenError("Trainers can only cancel their own classes.");
    }
    if (classRecord.status === "cancelled") {
      return ok({ class: classRecord });
    }
    const updated = await prisma.class.update({
      where: { id: classId },
      data: { status: "cancelled" },
    });
    const enrolledMembers = await prisma.classEnrollment.findMany({
      where: { classId, status: { in: ["confirmed", "waitlisted", "pending_payment"] } },
      select: { memberId: true },
    });
    if (enrolledMembers.length) {
      await createDirectNotification({
        orgId,
        createdById: userId,
        type: "OPERATIONAL",
        title: "Class cancelled",
        body: `${classRecord.name} on ${classRecord.startTime.toLocaleString()} has been cancelled.`,
        audience: "selected_members",
        userIds: enrolledMembers.map((entry) => entry.memberId),
        metadata: { classId } as Prisma.InputJsonValue,
      });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.cancelled",
      entityType: "class",
      entityId: classId,
      metadata: { notifiedMembers: enrolledMembers.length },
    });
    return ok({ class: updated });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "classes", /.+/, "enroll"])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const actorUserId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const body = classEnrollmentSchema.parse(await readJson(request));
    const userId = body.memberUserId ?? actorUserId;
    if (body.memberUserId && body.memberUserId !== actorUserId) {
      requireOrgAnyPermission(ctx, orgId, ["ATTENDANCE_APPROVE"]);
    }
    await assertRateLimit(
      "classEnrollmentByUser",
      userId,
      "Too many enrollment requests.",
    );
    await assertOrgUser({ orgId, userId, role: "MEMBER" });
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    if (classRecord.status !== "scheduled") {
      throw conflictError("Class is not open for enrollment.");
    }
    const bookingSettings = await assertMemberCanBookClass(orgId, userId);
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { classId_memberId: { classId, memberId: userId } },
    });
    if (existingEnrollment?.status === "confirmed") {
      return ok({
        enrollment: existingEnrollment,
        remainingCapacity: Math.max(0, classRecord.maxCapacity - (await reservedEnrollmentCount(classId))),
      });
    }
    if (existingEnrollment?.status === "pending_payment" && existingEnrollment.paymentSessionId) {
      const session = await prisma.paymentSession.findUnique({
        where: { id: existingEnrollment.paymentSessionId },
      });
      if (session && ["CREATED", "PENDING", "REQUIRES_ACTION"].includes(session.status)) {
        return ok({
          enrollment: existingEnrollment,
          remainingCapacity: Math.max(0, classRecord.maxCapacity - (await reservedEnrollmentCount(classId))),
          checkoutUrl: session.checkoutUrl,
          checkoutData: jsonObject(session.metadata),
          session,
          refundPolicy: { cutoffHours: bookingSettings.refundCutoffHours },
        });
      }
    }
    const confirmedEnrollmentCount =
      classRecord.pricePaise > 0
        ? await reservedEnrollmentCount(classId)
        : await prisma.classEnrollment.count({
            where: { classId, status: "confirmed" },
          });
    const decision = decideClassEnrollment({
      maxCapacity: classRecord.maxCapacity,
      confirmedEnrollmentCount,
      allowWaitlist: true,
    });
    if (classRecord.pricePaise > 0 && decision.status === "waitlisted") {
      const enrollment = await prisma.classEnrollment.upsert({
        where: { classId_memberId: { classId, memberId: userId } },
        update: {
          status: "waitlisted",
          cancelledAt: null,
          enrolledAt: new Date(),
          paymentSessionId: null,
        },
        create: {
          classId,
          memberId: userId,
          status: "waitlisted",
        },
      });
      return ok({
        enrollment,
        remainingCapacity: decision.remainingCapacity,
        paymentRequired: false,
        waitlisted: true,
      });
    }
    if (classRecord.pricePaise > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true },
      });
      const enrollment = await prisma.classEnrollment.upsert({
        where: { classId_memberId: { classId, memberId: userId } },
        update: {
          status: "pending_payment",
          cancelledAt: null,
          enrolledAt: new Date(),
        },
        create: {
          classId,
          memberId: userId,
          status: "pending_payment",
        },
      });
      const session = await prisma.paymentSession.create({
        data: {
          provider: "mock",
          orgId,
          branchId: classRecord.branchId,
          userId,
          purpose: "CLASS_BOOKING",
          amountPaise: classRecord.pricePaise,
          currency: "INR",
          status: "CREATED",
          checkoutUrl: "",
          metadata: {
            orgId,
            classId: classRecord.id,
            classEnrollmentId: enrollment.id,
          } as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 20 * 60_000),
        },
      });
      const started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user?.name ?? undefined,
          email: user?.email ?? undefined,
          phone: user?.phone ?? undefined,
        }),
      });
      const updatedEnrollment = await prisma.classEnrollment.update({
        where: { id: enrollment.id },
        data: { paymentSessionId: started.session.id },
      });
      return ok({
        enrollment: updatedEnrollment,
        remainingCapacity: decision.remainingCapacity,
        paymentRequired: true,
        checkoutUrl: started.checkoutUrl,
        checkoutData: started.checkout.checkoutData ?? null,
        session: started.session,
        refundPolicy: { cutoffHours: bookingSettings.refundCutoffHours },
      });
    }
    const enrollment = await prisma.classEnrollment.upsert({
      where: { classId_memberId: { classId, memberId: userId } },
      update: clean({
        status: decision.status,
        cancelledAt: null,
        enrolledAt: new Date(),
      }),
      create: {
        classId,
        memberId: userId,
        status: decision.status,
      },
    });
    return ok({ enrollment, remainingCapacity: decision.remainingCapacity });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "classes", /.+/, "roster", /.+/, "attendance"])
  ) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const memberId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgAnyPermission(ctx, orgId, ["ATTENDANCE_APPROVE"]);
    const body = classAttendanceSchema.parse(await readJson(request));
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    if (classRecord.status === "cancelled") {
      throw validationError("Cannot mark attendance for a cancelled class.");
    }
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_memberId: { classId, memberId } },
    });
    if (!enrollment || enrollment.status === "cancelled") {
      throw notFoundError("Member is not enrolled in this class.");
    }
    const updated = await prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { attendanceStatus: body.status },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.attendance_marked",
      entityType: "class_enrollment",
      entityId: enrollment.id,
      metadata: { memberId, classId, status: body.status },
    });
    return ok({ ok: true, memberId, attendanceStatus: updated.attendanceStatus });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "classes", /.+/, "enroll"])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, orgId);
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_memberId: { classId, memberId: userId } },
    });
    if (!enrollment || enrollment.status === "cancelled") {
      throw notFoundError("You are not enrolled in this class.");
    }
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
    const settings = classSettings(org?.settings);
    const refundAllowed =
      classRecord.pricePaise > 0 &&
      enrollment.status === "confirmed" &&
      Boolean(enrollment.paymentId) &&
      Date.now() < classRecord.startTime.getTime() - settings.refundCutoffHours * 60 * 60_000;
    const wasConfirmed = enrollment.status === "confirmed";
    await prisma.classEnrollment.update({
      where: { classId_memberId: { classId, memberId: userId } },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    let refund: unknown = null;
    if (refundAllowed && enrollment.paymentId) {
      refund = await refundPaymentForActor({
        request,
        paymentId: enrollment.paymentId,
        actorUserId: userId,
        reason: "Class booking cancelled before cutoff",
      });
      await prisma.classEnrollment.update({
        where: { id: enrollment.id },
        data: { refundPaymentId: enrollment.paymentId, refundedAt: new Date() },
      });
    }
    // Free seats still auto-promote. Paid waitlisted members must pay first, so they stay waitlisted.
    if (wasConfirmed && classRecord.pricePaise === 0) {
      const nextWaitlisted = await prisma.classEnrollment.findFirst({
        where: { classId, status: "waitlisted" },
        orderBy: { enrolledAt: "asc" },
      });
      if (nextWaitlisted) {
        await prisma.classEnrollment.update({
          where: { id: nextWaitlisted.id },
          data: { status: "confirmed" },
        });
      }
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "class.enrollment_cancelled",
      entityType: "class_enrollment",
      entityId: enrollment.id,
      metadata: { classId, refundAllowed },
    });
    return ok({ ok: true, refund, refundAllowed });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "classes", /.+/, "roster"])) {
    const orgId = path[1]!;
    const classId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["TRAINERS_MANAGE", "ATTENDANCE_APPROVE", "MEMBERS_VIEW"]);
    const classRecord = await prisma.class.findFirst({ where: { id: classId, orgId } });
    if (!classRecord) {
      throw notFoundError("Class not found");
    }
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, status: { in: ["confirmed", "waitlisted"] } },
      orderBy: { enrolledAt: "asc" },
    });
    const members = enrollments.length
      ? await prisma.user.findMany({
          where: { id: { in: enrollments.map((entry) => entry.memberId) } },
          select: { id: true, name: true },
        })
      : [];
    const memberNames = new Map(members.map((member) => [member.id, member.name]));
    return ok({
      class: {
        id: classRecord.id,
        name: classRecord.name,
        startTime: classRecord.startTime,
        maxCapacity: classRecord.maxCapacity,
        pricePaise: classRecord.pricePaise,
      },
      roster: enrollments.map((entry) => ({
        memberId: entry.memberId,
        name: memberNames.get(entry.memberId) ?? null,
        status: entry.status,
        attendanceStatus: entry.attendanceStatus ?? "PENDING",
        paymentStatus: entry.paidAt ? "paid" : classRecord.pricePaise > 0 ? "unpaid" : "comp",
        paidAt: entry.paidAt,
        enrolledAt: entry.enrolledAt,
      })),
    });
  }
  return undefined;
}
