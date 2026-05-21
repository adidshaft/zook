import type { ComponentProps } from "react";
import { cookies } from "next/headers";
import {
  accountDestinationLabel,
  destinationToHref,
  publicAccountDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";
import { PublicNav } from "./public-nav";

type AccountAwarePublicNavProps = Omit<
  ComponentProps<typeof PublicNav>,
  "loginHref" | "loginLabel"
> & {
  locale: PublicLocale;
};

export async function AccountAwarePublicNav({ locale, ...props }: AccountAwarePublicNavProps) {
  const cookieStore = await cookies();
  const session = await resolveSessionSummaryFromToken(
    cookieStore.get(sessionCookieName)?.value,
  ).catch(() => null);
  const origins = getOrigins();
  const accountDestination = publicAccountDestination(session);
  const accountLabel = accountDestination
    ? accountDestinationLabel(accountDestination, {
        platform: "Platform",
        dashboard: publicT(locale, "dashboard"),
        desk: publicT(locale, "desk"),
        coach: publicT(locale, "coach"),
        membership: publicT(locale, "myMembership"),
      })
    : null;
  const accountHref = accountDestination
    ? destinationToHref(accountDestination, "public", origins)
    : null;

  return (
    <PublicNav
      {...props}
      loginHref={
        accountHref?.startsWith("/")
          ? localizedPath(accountHref, locale)
          : (accountHref ?? localizedPath("/login", locale))
      }
      loginLabel={accountLabel ?? publicT(locale, "login")}
    />
  );
}
