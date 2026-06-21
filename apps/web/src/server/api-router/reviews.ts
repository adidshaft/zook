import type { NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { z } from "zod";

import { getRequestContext, requireAuth } from "../access";
import { forbiddenError, notFoundError } from "../errors";
import { ok, readJson } from "../response";
import { pathMatches } from "./core";

const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1200).optional().default(""),
});

function emptyBreakdown() {
  return { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } as Record<string, number>;
}

async function canUserReview(orgId: string, userId?: string | null) {
  if (!userId) return false;
  const [subscription, profile, attendance] = await Promise.all([
    prisma.memberSubscription.findFirst({ where: { orgId, memberUserId: userId }, select: { id: true } }),
    prisma.memberProfile.findUnique({ where: { orgId_userId: { orgId, userId } }, select: { id: true } }),
    prisma.attendanceRecord.findFirst({ where: { orgId, userId }, select: { id: true } }),
  ]);
  return Boolean(subscription || profile || attendance);
}

function summarizeReviews(reviews: Array<{ rating: number }>) {
  const breakdown = emptyBreakdown();
  for (const review of reviews) {
    breakdown[String(review.rating)] = (breakdown[String(review.rating)] ?? 0) + 1;
  }
  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10
    : 0;
  return { average, count, breakdown };
}

export async function handleReviews(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "reviews"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) throw notFoundError("Gym not found");
    const reviews = await prisma.gymReview.findMany({
      where: { orgId, status: "published" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const users = reviews.length
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(new Set(reviews.map((review) => review.userId))) } },
          select: { id: true, name: true },
        })
      : [];
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const myReview = ctx.userId
      ? await prisma.gymReview.findUnique({ where: { orgId_userId: { orgId, userId: ctx.userId } } })
      : null;
    return ok({
      summary: summarizeReviews(reviews),
      reviews: reviews.map((review) => ({
        id: review.id,
        userId: review.userId,
        name: userNames.get(review.userId) ?? "Member",
        rating: review.rating,
        body: review.body ?? "",
        createdAt: review.createdAt,
      })),
      canReview: await canUserReview(orgId, ctx.userId),
      myReview:
        myReview && myReview.status === "published"
          ? {
              id: myReview.id,
              userId: myReview.userId,
              name: ctx.userId ? userNames.get(ctx.userId) ?? "You" : "You",
              rating: myReview.rating,
              body: myReview.body ?? "",
              createdAt: myReview.createdAt,
            }
          : null,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "reviews"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) throw notFoundError("Gym not found");
    if (!(await canUserReview(orgId, userId))) {
      throw forbiddenError("Only members can review this gym.");
    }
    const body = reviewInputSchema.parse(await readJson(request));
    const review = await prisma.gymReview.upsert({
      where: { orgId_userId: { orgId, userId } },
      create: {
        orgId,
        userId,
        rating: body.rating,
        body: body.body || null,
        status: "published",
      },
      update: {
        rating: body.rating,
        body: body.body || null,
        status: "published",
      },
    });
    return ok({ review });
  }

  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "reviews", /.+/])) {
    const orgId = path[1]!;
    const reviewId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    const review = await prisma.gymReview.findFirst({ where: { id: reviewId, orgId } });
    if (!review) throw notFoundError("Review not found");
    const canModerate = ctx.permissions.includes("MEMBERS_VIEW");
    if (review.userId !== userId && !canModerate) {
      throw forbiddenError("You can only remove your own review.");
    }
    const updated = await prisma.gymReview.update({
      where: { id: review.id },
      data: { status: "hidden" },
    });
    return ok({ review: updated });
  }

  return undefined;
}
