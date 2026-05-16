import { redirect } from "next/navigation";
import { CoachCommandPanel } from "@/components/coach-command-panel";
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

  const firstName = (session.user.name ?? "Coach").trim().split(/\s+/)[0] ?? "Coach";

  // Server-side placeholders until the trainer mobile API surfaces these
  // server-truth. Keeps the surface visually meaningful without misleading
  // any number — counts of 0 read as "no data" rather than fake activity.
  const stats = {
    assignedClients: 0,
    plansAssigned: 0,
    sessionsThisWeek: 0,
    progressNotes: 0,
  };

  return <CoachCommandPanel firstName={firstName} stats={stats} />;
}
