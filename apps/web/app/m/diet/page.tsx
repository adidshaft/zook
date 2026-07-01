import type { Metadata } from "next";
import { prisma } from "@zook/db";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { GlassCard, Pill } from "@/components/glass-card";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
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
    ? await prisma.dietPlanMeal.findMany({
        where: { dietPlanId: plan.id },
        orderBy: { order: "asc" },
      })
    : [];

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PublicNav locale={locale}>
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <GlassCard variant="strong" className="p-6 md:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">My diet plan</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Read your active trainer-published meal plan on web. Meal logging and adherence updates
            stay in the Zook app.
          </p>
        </GlassCard>
        {plan ? (
          <GlassCard className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <Pill tone="blue">Active plan</Pill>
                <h2 className="mt-4 text-2xl font-semibold text-white">{plan.title}</h2>
                <p className="mt-2 text-sm text-white/50">Updated {plan.updatedAt.toLocaleDateString("en-IN")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <Macro label="Calories" value={plan.calorieTarget ? `${plan.calorieTarget}` : "-"} />
                <Macro label="Protein" value={plan.proteinG ? `${plan.proteinG}g` : "-"} />
                <Macro label="Carbs" value={plan.carbsG ? `${plan.carbsG}g` : "-"} />
                <Macro label="Fats" value={plan.fatsG ? `${plan.fatsG}g` : "-"} />
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {meals.map((meal) => (
                <div key={meal.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-white">{meal.name}</h3>
                    {meal.timeOfDay ? <Pill>{meal.timeOfDay}</Pill> : null}
                  </div>
                  <p className="mt-2 text-sm text-white/55">
                    {meal.calories ?? 0} kcal · {meal.proteinG ?? 0}P/{meal.carbsG ?? 0}C/{meal.fatsG ?? 0}F
                  </p>
                  {Array.isArray(meal.items) && meal.items.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/60">
                      {meal.items.map((item, index) => (
                        <li key={`${meal.id}-${index}`}>{String(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <AppHandoffCard
                minimal
                title="Log meals in the Zook app"
                description="Meal check-ins, adherence history, and trainer updates in mobile."
                deepLink="zook://diet"
              />
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white">No diet plan yet</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Your trainer has not published a diet plan for you yet.
            </p>
            <div className="mt-4">
              <AppHandoffCard
                minimal
                title="Ask your trainer in the app"
                description="Diet plans are published by trainers in the Zook mobile app."
                deepLink="zook://diet"
              />
            </div>
          </GlassCard>
        )}
      </div>
    </main>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
