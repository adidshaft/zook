import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

async function createReviewActor(orgId: string, email: string, eligible: boolean) {
  const user = await prisma.user.create({
    data: { email, emailVerifiedAt: new Date(), name: email.split("@")[0] ?? "Reviewer" },
  });
  await prisma.organizationUser.create({ data: { orgId, userId: user.id, status: "active" } });
  await prisma.organizationRoleAssignment.create({ data: { orgId, userId: user.id, role: "MEMBER" } });
  if (eligible) {
    await prisma.memberProfile.create({ data: { orgId, userId: user.id } });
  }
  return user;
}

test.describe("gym reviews actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("reviews require member eligibility and summarize published reviews", async ({ page }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    await prisma.gymReview.deleteMany({ where: { orgId: org.id } });
    const suffix = Date.now();
    const outsider = await createReviewActor(org.id, `review-outsider-${suffix}@zook.local`, false);
    const reviewer = await createReviewActor(org.id, `review-member-${suffix}@zook.local`, true);
    const secondReviewer = await createReviewActor(org.id, `review-second-${suffix}@zook.local`, true);

    await loginWithSessionCookie(page, outsider.email!);
    const forbidden = await page.request.post(`/api/orgs/${org.id}/reviews`, {
      data: { rating: 5, body: "Looks nice" },
    });
    expect(forbidden.status()).toBe(403);

    await loginWithSessionCookie(page, reviewer.email!);
    const first = await expectApiOk<{ review: { id: string; rating: number; body: string | null } }>(
      await page.request.post(`/api/orgs/${org.id}/reviews`, {
        data: { rating: 5, body: "Great coaching floor." },
      }),
    );
    const updated = await expectApiOk<{ review: { id: string; rating: number; body: string | null } }>(
      await page.request.post(`/api/orgs/${org.id}/reviews`, {
        data: { rating: 4, body: "Great coaching floor, busy evenings." },
      }),
    );
    expect(updated.data.review.id).toBe(first.data.review.id);
    expect(updated.data.review.rating).toBe(4);

    await loginWithSessionCookie(page, secondReviewer.email!);
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/reviews`, {
        data: { rating: 2, body: "Good equipment, needs more lockers." },
      }),
    );

    const reviews = await expectApiOk<{
      summary: { average: number; count: number; breakdown: Record<string, number> };
      reviews: Array<{ userId: string; name: string; rating: number; body: string }>;
      canReview: boolean;
      myReview: { userId: string; rating: number } | null;
    }>(await page.request.get(`/api/orgs/${org.id}/reviews`));

    expect(reviews.data.summary).toMatchObject({
      average: 3,
      count: 2,
      breakdown: expect.objectContaining({ "4": 1, "2": 1 }),
    });
    expect(reviews.data.canReview).toBe(true);
    expect(reviews.data.myReview).toMatchObject({ userId: secondReviewer.id, rating: 2 });
    expect(reviews.data.reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: reviewer.id, name: reviewer.name, rating: 4 }),
        expect.objectContaining({ userId: secondReviewer.id, name: secondReviewer.name, rating: 2 }),
      ]),
    );
  });
});
