import type { ComponentProps } from "react";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import type { PublicLocale } from "@/lib/public-i18n";

type AccountAwarePublicNavProps = Omit<
  ComponentProps<typeof PublicNav>,
  "loginHref" | "loginLabel"
> & {
  locale: PublicLocale;
};

export function AccountAwarePublicNav({ locale, ...props }: AccountAwarePublicNavProps) {
  return (
    <PublicNav {...props} locale={locale}>
      <AccountAwareNav locale={locale} />
    </PublicNav>
  );
}
