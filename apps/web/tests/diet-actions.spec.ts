import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("diet and body progress actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("trainer publishes diet plan, member logs meal, and trainer records measurements", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "trainer@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "trainer@zook.local" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    await prisma.trainerAssignment.upsert({
      where: {
        orgId_trainerUserId_memberUserId: {
          orgId: org.id,
          trainerUserId: trainer.id,
          memberUserId: member.id,
        },
      },
      update: { active: true },
      create: { orgId: org.id, trainerUserId: trainer.id, memberUserId: member.id, active: true },
    });

    const diet = await expectApiOk<{
      plan: { id: string; memberId: string; status: string; meals: Array<{ name: string }> };
    }>(
      await page.request.post(
        `/api/orgs/${org.id}/trainers/${trainer.id}/clients/${member.id}/diet-plans`,
        {
          data: {
            title: `Playwright Diet ${Date.now()}`,
            calorieTarget: 2100,
            proteinG: 130,
            carbsG: 230,
            fatsG: 65,
            status: "PUBLISHED",
            meals: [
              { name: "Breakfast", calories: 450, proteinG: 28, carbsG: 52, fatsG: 12, items: ["Oats"], order: 0 },
              { name: "Lunch", calories: 650, proteinG: 36, carbsG: 80, fatsG: 18, items: ["Roti", "Dal"], order: 1 },
              { name: "Snack", calories: 250, proteinG: 22, carbsG: 20, fatsG: 8, items: ["Fruit"], order: 2 },
              { name: "Dinner", calories: 550, proteinG: 40, carbsG: 55, fatsG: 16, items: ["Paneer"], order: 3 },
            ],
          },
        },
      ),
    );
    expect(diet.data.plan).toMatchObject({ memberId: member.id, status: "PUBLISHED" });
    expect(diet.data.plan.meals).toHaveLength(4);

    const bodyProgress = await expectApiOk<{ entry: { id: string; recordedByUserId: string } }>(
      await page.request.post(
        `/api/orgs/${org.id}/trainers/${trainer.id}/clients/${member.id}/body-progress`,
        {
          data: {
            organizationId: org.id,
            measuredAt: new Date().toISOString(),
            weightKg: 72.4,
            waistCm: 82,
            bodyFatPercent: 18,
            visibility: "TRAINER_VISIBLE",
          },
        },
      ),
    );
    expect(bodyProgress.data.entry.recordedByUserId).toBe(trainer.id);

    await loginWithSessionCookie(page, "member@zook.local");
    const memberDiet = await expectApiOk<{ plan: { id: string; meals: Array<{ name: string }> } }>(
      await page.request.get("/api/me/diet"),
    );
    expect(memberDiet.data.plan.id).toBe(diet.data.plan.id);
    expect(memberDiet.data.plan.meals.map((meal) => meal.name)).toContain("Breakfast");

    const mealLog = await expectApiOk<{ log: { id: string; calories: number } }>(
      await page.request.post("/api/me/diet/meal-logs", {
        data: {
          organizationId: org.id,
          dietPlanId: diet.data.plan.id,
          mealName: "1 roti deviation",
          calories: 80,
          proteinG: 3,
          carbsG: 16,
          fatsG: 1,
        },
      }),
    );
    expect(mealLog.data.log.calories).toBe(80);
  });
});
