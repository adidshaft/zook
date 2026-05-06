import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../messages/dashboard/en.json";
import hiMessages from "../../messages/dashboard/hi.json";
import { requireDashboardSession } from "@/lib/server-auth";

function resolveDeskMessages(locale?: string | null) {
  return locale === "hi" ? hiMessages : enMessages;
}

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession();
  const locale = session.user.preferredLocale === "hi" ? "hi" : "en";

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={resolveDeskMessages(locale)}
      timeZone="Asia/Kolkata"
    >
      {children}
    </NextIntlClientProvider>
  );
}
