import Link from "next/link";
import { X } from "lucide-react";
import { redirect } from "next/navigation";
import { AttendanceQrPanel } from "@/components/attendance-qr-panel";
import { hasDeskAccess, hasOwnerDashboardAccess, resolvePostLoginPath } from "@/lib/auth-destinations";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata = {
  title: "Entry QR | Zook Desk",
  robots: { index: false, follow: false },
};

export default async function DeskQrPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const session = await requireDashboardSession();
  if (!session.activeOrgId) {
    redirect(resolvePostLoginPath(session));
  }
  if (
    !session.user.isPlatformAdmin &&
    !hasOwnerDashboardAccess(session) &&
    !hasDeskAccess(session)
  ) {
    redirect(resolvePostLoginPath(session));
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-6">
      <Link
        href={resolvedSearch.branchId ? `/desk?branchId=${encodeURIComponent(resolvedSearch.branchId)}` : "/desk"}
        className="zook-focus fixed right-5 top-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/40 text-white/78"
        aria-label="Close entry QR"
      >
        <X size={20} />
      </Link>
      <div className="w-full max-w-2xl">
        <AttendanceQrPanel orgId={session.activeOrgId} branchId={resolvedSearch.branchId ?? null} />
      </div>
    </main>
  );
}
