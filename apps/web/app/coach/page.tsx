import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, Smartphone } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { hasCoachAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata = {
  title: "Coach | Zook",
  robots: { index: false, follow: false },
};

export default async function CoachPage() {
  const session = await requireDashboardSession();
  if (session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)) {
    redirect("/dashboard");
  }
  if (!hasCoachAccess(session)) {
    redirect("/me");
  }

  return (
    <main className="min-h-dvh px-5 py-5">
      <div className="mx-auto grid max-w-3xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-white/70">
            Zook
          </Link>
          <DashboardSignOutButton compact />
        </div>
        <GlassCard variant="strong" className="p-6 md:p-8">
          <Pill tone="lime">Trainer account</Pill>
          <div className="mt-5 flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime-300 text-black">
              <Dumbbell size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Use the Zook app for coaching.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Trainer workflows are mobile-first: assigned clients, plans, workout updates, and
                member progress stay in the app where coaching happens.
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <Smartphone className="text-lime-200" size={20} />
            <div>
              <p className="font-medium text-white">Mobile app links are coming soon.</p>
              <p className="mt-1 text-sm text-white/48">
                Until store links are published, ask the gym owner for the test app invite.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
