import { notFound, redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { localizedPath, resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";
import { isReservedSlug, isValidSlugFormat } from "@/server/member-slug";

export default async function MemberSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const normalizedSlug = slug.toLowerCase();
  if (!isValidSlugFormat(normalizedSlug) || isReservedSlug(normalizedSlug)) {
    notFound();
  }

  const memberPath = localizedPath(`/m/${normalizedSlug}`, locale);
  const session = await requireDashboardSession({ loginRedirectPath: memberPath });
  const ownSlug = session.user.slug?.toLowerCase();

  if (!ownSlug) {
    redirect(localizedPath("/me", locale));
  }
  if (normalizedSlug !== ownSlug) {
    redirect(localizedPath(`/m/${ownSlug}`, locale));
  }

  return renderMembershipSurface(session, locale);
}
