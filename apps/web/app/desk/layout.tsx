import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../messages/dashboard/en.json";
import hiMessages from "../../messages/dashboard/hi.json";
import { DeskChrome } from "@/components/desk/desk-chrome";
import {
  destinationToHref,
  hasCoachAccess,
  hasDeskAccess,
  hasOwnerDashboardAccess,
  resolvePostLoginDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";

function resolveDeskMessages(locale?: string | null) {
  return locale === "hi" ? hiMessages : enMessages;
}

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/desk",
  });
  const locale = session.user.preferredLocale === "hi" ? "hi" : "en";
  const origins = getOrigins();
  if (hasCoachAccess(session) && !hasDeskAccess(session) && !hasOwnerDashboardAccess(session)) {
    redirect("/coach");
  }
  if (
    !session.user.isPlatformAdmin &&
    !hasOwnerDashboardAccess(session) &&
    !hasDeskAccess(session)
  ) {
    redirect(destinationToHref(resolvePostLoginDestination(session), "dashboard", origins));
  }
  if (!session.activeOrgId || !session.activeOrganization) {
    redirect(destinationToHref(resolvePostLoginDestination(session), "dashboard", origins));
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={resolveDeskMessages(locale)}
      timeZone="Asia/Kolkata"
    >
      <DeskChrome
        orgId={session.activeOrgId}
        orgName={session.activeOrganization.name}
        locale={locale}
        permissions={session.activeOrganization.permissions}
        canOpenManagement={session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)}
      >
        {children}
      </DeskChrome>
    </NextIntlClientProvider>
  );
}
