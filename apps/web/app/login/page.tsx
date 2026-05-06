import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRedirectTarget(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function postLoginPath(
  session: NonNullable<Awaited<ReturnType<typeof resolveSessionSummaryFromToken>>>,
  requestedPath?: string | null,
) {
  if (requestedPath?.startsWith("/platform")) {
    return session.user.isPlatformAdmin ? requestedPath : "/dashboard";
  }
  if (requestedPath) {
    return requestedPath;
  }
  if (session.user.isPlatformAdmin) {
    return "/platform";
  }
  return session.activeOrgId ? "/dashboard" : "/gyms";
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

  if (session) {
    redirect(postLoginPath(session, redirectTarget));
  }

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
      <Suspense fallback={<div className="glass-panel h-[360px] w-full max-w-md rounded-[28px]" />}>
        <LoginPanel locale={locale} />
      </Suspense>
    </main>
  );
}
