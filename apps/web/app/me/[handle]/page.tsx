import { redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";

export default async function PrivateMemberHandlePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireDashboardSession();
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const { handle } = await params;
  const privateHandle = session.user.privateHandle?.toLowerCase();

  if (session.user.slug) {
    redirect(`/m/${session.user.slug}`);
  }
  if (!privateHandle || privateHandle !== handle.toLowerCase()) {
    redirect("/me");
  }

  return renderMembershipSurface(session, locale);
}
