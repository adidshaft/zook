import type { Metadata } from "next";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { PublicNav } from "@/components/public/nav/public-nav";
import { resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "My diet plan | Zook",
  description: "Read-only view of your active Zook diet plan.",
  robots: { index: false, follow: false },
};

export default async function MemberDietPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const session = await requireDashboardSession({ loginRedirectPath: "/m/diet" });
  const plan = await prisma.dietPlan.findFirst({
    where: { memberId: session.user.id, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
  });
  const meals = plan
    ? await prisma.dietPlanMeal.findMany({ where: { dietPlanId: plan.id }, orderBy: { order: "asc" } })
    : [];

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PublicNav locale={locale} />
        <GlassCard variant="strong" className="p-6 md:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {plan?.title ?? "No active diet plan"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            {plan
              ? `${plan.calorieTarget ?? "-"} kcal target with ${plan.proteinG ?? "-"}g protein.`
              : "No published diet plan from your trainer yet."}
          </p>
        </GlassCard>
        {meals.map((meal) => (
          <GlassCard key={meal.id} className="p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{meal.name}</h2>
                <p className="mt-1 text-sm text-white/50">{meal.timeOfDay ?? "Flexible timing"}</p>
              </div>
              <Pill>
                {meal.calories ?? 0} kcal · {meal.proteinG ?? 0}P/{meal.carbsG ?? 0}C/{meal.fatsG ?? 0}F
              </Pill>
            </div>
            {Array.isArray(meal.items) && meal.items.length ? (
              <p className="mt-4 text-sm text-white/60">{meal.items.join(", ")}</p>
            ) : null}
          </GlassCard>
        ))}
      </div>
    </main>
  );
}
