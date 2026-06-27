import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@zook/db";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import {
  addPayoutAdjustment,
  getPayoutConfig,
  listPayouts,
  markPayoutPaid,
  upsertPayoutConfig,
} from "../domains/payouts";
import { notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  assertOrgUser,
  clean,
  getOrganizationScopedFileAsset,
  parseMemberProfileNotes,
  pathMatches,
  sanitizeRichText,
} from "./core";

const trainerProfileAssetSchema = z.object({
  upiId: z.string().trim().max(120).optional(),
  upiQrAssetId: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const payoutConfigSchema = z.object({
  baseMonthlyPaise: z.number().int().nonnegative(),
  ptCommissionPercent: z.number().int().min(0).max(100),
  perSessionFeePaise: z.number().int().nonnegative(),
  payDay: z.number().int().min(1).max(28),
});

const payoutAdjustmentSchema = z.object({
  amountPaise: z.number().int(),
  description: z.string().trim().min(2).max(160),
});

const payoutMarkPaidSchema = z.object({
  method: z.string().trim().min(2).max(40),
  note: z.string().trim().max(240).optional(),
  proofFileAssetId: z.string().optional(),
});

const trainerClientNoteSchema = z.object({
  note: z.string().max(2_000).default(""),
});

export async function handleTrainerOperations(request: NextRequest, path: string[]) {
  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "profile"])
  ) {
    const orgId = path[1]!;
    const trainerUserId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const actorUserId = requireAuth(ctx);
    if (actorUserId === trainerUserId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    const profile = await prisma.trainerProfile.findFirst({
      where: { orgId, userId: trainerUserId },
    });
    return ok({ profile });
  }

  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "profile"])
  ) {
    const orgId = path[1]!;
    const trainerUserId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const actorUserId = requireAuth(ctx);
    if (actorUserId === trainerUserId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    const body = trainerProfileAssetSchema.parse(await readJson(request));
    const upiQrAsset = await getOrganizationScopedFileAsset(body.upiQrAssetId, orgId, [
      "trainer_upi_qr",
    ]);
    const profile = await prisma.trainerProfile.upsert({
      where: { orgId_userId: { orgId, userId: trainerUserId } },
      update: clean({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {}),
      }),
      create: clean({
        orgId,
        userId: trainerUserId,
        ...(body.bio ? { bio: body.bio } : {}),
        ...(body.upiId ? { upiId: body.upiId } : {}),
        ...(upiQrAsset ? { upiQrAssetId: upiQrAsset.id } : {}),
      }),
    });
    return ok({ profile, upiQrFile: upiQrAsset });
  }

  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "clients", /.+/, "note"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const clientId = path[5]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PLANS_CREATE");
    } else {
      requireOrgPermission(ctx, orgId, "MEMBERS_VIEW");
    }
    const assignment = await prisma.trainerAssignment.findFirst({
      where: { orgId, trainerUserId: trainerId, memberUserId: clientId, active: true },
    });
    if (!assignment) {
      throw notFoundError("Trainer client not found");
    }
    const body = trainerClientNoteSchema.parse(await readJson(request));
    const currentProfile = await prisma.memberProfile.findUnique({
      where: { orgId_userId: { orgId, userId: clientId } },
    });
    const nextNotes = {
      ...parseMemberProfileNotes(currentProfile?.notes),
      trainerNote: sanitizeRichText(body.note.trim()) || undefined,
    };
    const profile = await prisma.memberProfile.upsert({
      where: { orgId_userId: { orgId, userId: clientId } },
      update: { notes: JSON.stringify(nextNotes) },
      create: { orgId, userId: clientId, notes: JSON.stringify(nextNotes) },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: requesterId,
      action: "trainer.client_note.updated",
      entityType: "member_profile",
      entityId: profile.id,
      metadata: { trainerUserId: trainerId, memberUserId: clientId },
    });
    return ok({ note: body.note });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payout-config"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PT_RECORD");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    await assertOrgUser({ orgId, userId: trainerId, role: "TRAINER" });
    return ok({ config: await getPayoutConfig(orgId, trainerId) });
  }

  if (
    request.method === "GET" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payouts"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const requesterId = requireAuth(ctx);
    if (requesterId === trainerId) {
      requireOrgPermission(ctx, orgId, "PT_RECORD");
    } else {
      requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    }
    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const payouts = await listPayouts(orgId, month);
    return ok({ payouts: payouts.filter((payout) => payout.trainerId === trainerId) });
  }

  if (
    request.method === "PUT" &&
    pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "payout-config"])
  ) {
    const orgId = path[1]!;
    const trainerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    await assertOrgUser({ orgId, userId: trainerId, role: "TRAINER" });
    const body = payoutConfigSchema.parse(await readJson(request));
    const config = await upsertPayoutConfig(orgId, trainerId, body);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_config.updated",
      entityType: "trainer_payout_config",
      entityId: config.id,
      metadata: { trainerId },
    });
    return ok({ config });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "payouts"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    return ok({ payouts: await listPayouts(orgId, month) });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "payouts", /.+/, "adjust"])) {
    const orgId = path[1]!;
    const payoutId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const body = payoutAdjustmentSchema.parse(await readJson(request));
    const line = await addPayoutAdjustment({
      orgId,
      payoutId,
      amountPaise: body.amountPaise,
      description: body.description,
      createdById: userId,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_adjusted",
      entityType: "trainer_payout_line",
      entityId: line.id,
      metadata: { payoutId, amountPaise: body.amountPaise },
    });
    return ok({ line });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "payouts", /.+/, "mark-paid"])
  ) {
    const orgId = path[1]!;
    const payoutId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
    const body = payoutMarkPaidSchema.parse(await readJson(request));
    if (body.proofFileAssetId) {
      await getOrganizationScopedFileAsset(body.proofFileAssetId, orgId, ["payment_proof"]);
    }
    const payout = await markPayoutPaid({
      orgId,
      payoutId,
      paidById: userId,
      method: body.method,
      ...(body.note ? { note: body.note } : {}),
      ...(body.proofFileAssetId ? { proofFileAssetId: body.proofFileAssetId } : {}),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "trainer.payout_paid",
      entityType: "trainer_payout",
      entityId: payout.id,
      metadata: { method: body.method },
    });
    return ok({ payout });
  }

  return undefined;
}
