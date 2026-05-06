import { Suspense } from "react";
import { cookies } from "next/headers";
import { LoginPanel } from "@/components/login-panel";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { publicAccountLink } from "@/lib/auth-destinations";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRedirectTarget(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const locale = resolvePublicLocale(resolvedSearchParams);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const redirectTarget = safeRedirectTarget(firstParam(resolvedSearchParams.redirect));
  const cookieStore = await cookies();
  const session = await resolveSessionSummaryFromToken(cookieStore.get(sessionCookieName)?.value);
  const accountLink = publicAccountLink(session, {
    dashboard: t("dashboard"),
    membership: t("myMembership"),
  });

  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="grid min-h-dvh place-items-center px-5 py-8"
    >
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <div className="absolute right-5 top-5">
        <a
          href={localizedPath("/login", nextLocale, {
            redirect: redirectTarget,
            email: firstParam(resolvedSearchParams.email),
          })}
          className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
        >
          {t("languageSwitch")}
        </a>
      </div>
      <div className="grid w-full max-w-md gap-4">
        {accountLink ? (
          <div className="glass-panel rounded-[24px] p-4">
            <p className="text-sm font-medium text-white">{t("alreadySignedIn")}</p>
            <p className="mt-1 text-xs leading-5 text-white/50">{t("switchAccountHint")}</p>
            <a
              href={localizedPath(accountLink.href, locale)}
              className="zook-focus mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/8 hover:text-white"
            >
              {accountLink.label}
            </a>
          </div>
        ) : null}
        <Suspense fallback={<div className="glass-panel h-[360px] w-full rounded-[28px]" />}>
          <LoginPanel locale={locale} />
        </Suspense>
      </div>
    </main>
  );
}
