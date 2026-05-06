import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../messages/dashboard/en.json";
import hiMessages from "../../messages/dashboard/hi.json";
import { requireDashboardSession } from "@/lib/server-auth";

function resolveDashboardMessages(locale?: string | null) {
  return locale === "hi" ? hiMessages : enMessages;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession();
  const locale = session.user.preferredLocale === "hi" ? "hi" : "en";

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={resolveDashboardMessages(locale)}
      timeZone="Asia/Kolkata"
    >
      {children}
    </NextIntlClientProvider>
  );
}
