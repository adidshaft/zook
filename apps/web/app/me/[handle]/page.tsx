import { redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { localizedPath, resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";

export default async function PrivateMemberHandlePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const { handle } = await params;
  const memberPath = localizedPath(`/me/${handle}`, locale);
  const session = await requireDashboardSession({ loginRedirectPath: memberPath });
  const privateHandle = session.user.privateHandle?.toLowerCase();

  if (session.user.slug) {
    redirect(localizedPath(`/m/${session.user.slug}`, locale));
  }
  if (!privateHandle || privateHandle !== handle.toLowerCase()) {
    redirect(localizedPath("/me", locale));
  }

  return renderMembershipSurface(session, locale);
}
