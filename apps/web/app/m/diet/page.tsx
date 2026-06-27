import type { Metadata } from "next";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { GlassCard } from "@/components/glass-card";
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
  await requireDashboardSession({ loginRedirectPath: "/m/diet" });

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PublicNav locale={locale}>
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <GlassCard variant="strong" className="p-6 md:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">My diet plan</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Diet plans, meal check-ins, and trainer nutrition updates are available in the Zook app.
          </p>
        </GlassCard>
        <AppHandoffCard
          title="Open your diet plan in the app"
          description="View meals, track adherence, and receive trainer updates in the Zook mobile app."
          deepLink="zook://diet"
        />
      </div>
    </main>
  );
}
