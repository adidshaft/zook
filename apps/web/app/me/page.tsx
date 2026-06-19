import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { renderMembershipSurface } from "@/components/member-membership-surface";
import { destinationToUrl, resolvePostLoginDestination } from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { resolvePublicLocale } from "@/lib/public-i18n";
import { requireDashboardSession } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "My membership | Zook",
  description: "View your Zook gym memberships, payment status, and renewal details.",
  robots: { index: false, follow: false },
};

export default async function MyMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const session = await requireDashboardSession({ loginRedirectPath: "/me" });
  const destination = resolvePostLoginDestination(session);

  if (destination.host === "dashboard") {
    redirect(destinationToUrl(destination, getOrigins()));
  }
  if (session.user.slug) {
    redirect(`/m/${session.user.slug}`);
  }

  return renderMembershipSurface(session, locale);
}
