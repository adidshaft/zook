import { notFound, redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { requireDashboardSession } from "@/lib/server-auth";
import { isReservedSlug, isValidSlugFormat } from "@/server/member-slug";

export default async function MemberSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  if (!isValidSlugFormat(normalizedSlug) || isReservedSlug(normalizedSlug)) {
    notFound();
  }

  const session = await requireDashboardSession({ loginRedirectPath: `/m/${normalizedSlug}` });
  const ownSlug = session.user.slug?.toLowerCase();

  if (!ownSlug) {
    redirect("/me");
  }
  if (normalizedSlug !== ownSlug) {
    redirect(`/m/${ownSlug}`);
  }

  return renderMembershipSurface(session);
}
