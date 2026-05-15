import type { ComponentProps } from "react";
import { cookies } from "next/headers";
import { publicAccountLink } from "@/lib/auth-destinations";
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

export async function AccountAwarePublicNav({
  locale,
  ...props
}: AccountAwarePublicNavProps) {
  const cookieStore = await cookies();
  const session = await resolveSessionSummaryFromToken(cookieStore.get(sessionCookieName)?.value);
  const accountLink = publicAccountLink(session, {
    platform: "Platform",
    dashboard: publicT(locale, "dashboard"),
    desk: publicT(locale, "desk"),
    coach: publicT(locale, "coach"),
    membership: publicT(locale, "myMembership"),
  });

  return (
    <PublicNav
      {...props}
      loginHref={localizedPath(accountLink?.href ?? "/login", locale)}
      loginLabel={accountLink?.label ?? publicT(locale, "login")}
    />
  );
}
