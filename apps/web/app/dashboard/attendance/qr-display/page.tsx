import Link from "next/link";
import { X } from "lucide-react";
import { redirect } from "next/navigation";
import { AttendanceQrPanel } from "@/components/attendance-qr-panel";
import { getDashboardData } from "@/lib/data";
import {
  destinationToHref,
  hasOwnerDashboardAccess,
  resolvePostLoginDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata = {
  title: "Check-in QR | Zook",
  robots: { index: false, follow: false },
};

export default async function DashboardQrDisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/dashboard/attendance/qr-display",
  });
  const origins = getOrigins();
  const postLoginHref = () =>
    destinationToHref(resolvePostLoginDestination(session), "dashboard", origins);
  if (!session.activeOrgId) {
    redirect(postLoginHref());
  }
  if (!session.user.isPlatformAdmin && !hasOwnerDashboardAccess(session)) {
    redirect("/desk");
  }

  const data = await getDashboardData(session.activeOrgId, resolvedSearch.branchId);
  const branch = data.branchScope.selectedBranch;
  const closeHref = resolvedSearch.branchId
    ? `/dashboard/attendance?branchId=${encodeURIComponent(resolvedSearch.branchId)}`
    : "/dashboard/attendance";

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-6">
      <Link
        href={closeHref}
        className="zook-focus fixed right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/40 text-white/78"
        aria-label="Close check-in QR"
      >
        <X size={20} />
      </Link>
      <div className="w-full max-w-2xl">
        <AttendanceQrPanel
          orgId={session.activeOrgId}
          branchId={branch?.id ?? resolvedSearch.branchId ?? null}
          branchName={branch?.name ?? null}
        />
      </div>
    </main>
  );
}
