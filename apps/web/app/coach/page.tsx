import { CoachPage as CoachOverviewPage } from "@/components/coach/coach-page";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata = {
  title: "Coach | Zook",
  robots: { index: false, follow: false },
};

export default async function CoachPage() {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/coach",
  });
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

  return <CoachOverviewPage firstName={firstName} stats={stats} />;
}
