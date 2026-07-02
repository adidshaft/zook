import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { localizedPath, resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";
import { isReservedSlug, isValidSlugFormat } from "@/server/member-slug";

type MemberSlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: MemberSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const normalizedSlug = slug.toLowerCase();
  if (!isValidSlugFormat(normalizedSlug) || isReservedSlug(normalizedSlug)) {
    return {
      title: "Member profile | Zook",
      description: "Private Zook member profile.",
      robots: { index: false, follow: false },
    };
  }

  try {
    const memberPath = localizedPath(`/m/${normalizedSlug}`, locale);
    const session = await requireDashboardSession({ loginRedirectPath: memberPath });
    const titleName = session.user.name || session.user.slug || "Member";
    return {
      title: `${titleName} | Zook`,
      description: "Private Zook member profile, membership, attendance, and payment summary.",
      robots: { index: false, follow: false },
      openGraph: session.user.profilePhotoUrl
        ? {
            title: `${titleName} | Zook`,
            description: "Private Zook member profile.",
            images: [{ url: session.user.profilePhotoUrl, alt: titleName }],
          }
        : undefined,
    };
  } catch {
    return {
      title: "Member profile | Zook",
      description: "Private Zook member profile.",
      robots: { index: false, follow: false },
    };
  }
}

export default async function MemberSlugPage({
  params,
  searchParams,
}: MemberSlugPageProps) {
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
