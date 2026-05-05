import Link from "next/link";
import { StaffInvitePanel } from "@/components/staff-invite-panel";
import { ZookLogo } from "@/components/zook-logo";

export default async function StaffInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="min-h-dvh px-5 py-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <ZookLogo />
        <Link href="/" className="text-sm font-medium text-white/55 transition hover:text-white">
          Zook
        </Link>
      </div>
      <div className="mx-auto mt-12 w-full max-w-xl">
        <StaffInvitePanel token={token} />
      </div>
    </main>
  );
}
