import { redirect } from "next/navigation";
import { TrainerDietPlansPanel } from "@/components/trainer-diet-plans-panel";
import { requireDashboardSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function TrainerClientDietPage({
  params,
}: {
  params: Promise<{ trainerId: string; clientId: string }>;
}) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard",
  });
  if (!session.activeOrgId) {
    redirect("/dashboard");
  }
  const { trainerId, clientId } = await params;

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto max-w-[1200px]">
        <TrainerDietPlansPanel
          orgId={session.activeOrgId}
          trainerId={trainerId}
          clientId={clientId}
        />
      </div>
    </main>
  );
}
