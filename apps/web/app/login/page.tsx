import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  type PublicLocale,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { destinationToHref, resolvePostLoginDestination } from "@/lib/auth-destinations";
import { loginDestinationLabel, loginRedirectMessage } from "@/lib/login-destination-labels";
import { getOrigins, webHostFromHeader } from "@/lib/origins";
import { publicSocialImage } from "@/lib/public-metadata";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export const metadata: Metadata = {
  title: "Sign in | Zook",
  description: "Sign in to Zook to continue to your gym dashboard, member portal, or checkout.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Sign in to Zook",
    description: "Continue to your gym dashboard, member portal, or checkout.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Sign in to Zook" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign in to Zook",
    description: "Continue to your gym dashboard, member portal, or checkout.",
    images: [publicSocialImage()],
  },
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRedirectTarget(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function localeFromRedirectTarget(value: string | null): PublicLocale | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value, "https://zook.local");
    return url.searchParams.get("lang") === "hi" ? "hi" : null;
  } catch {
    return null;
  }
}

function localizedRedirectTarget(value: string | null, locale: PublicLocale) {
  if (!value) {
    return value;
  }
  try {
    const url = new URL(value, "https://zook.local");
    if (locale === "hi") {
      url.searchParams.set("lang", "hi");
    } else {
      url.searchParams.delete("lang");
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectTarget = safeRedirectTarget(firstParam(resolvedSearchParams.redirect));
  const locale = localeFromRedirectTarget(redirectTarget) ?? resolvePublicLocale(resolvedSearchParams);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const headerCopy = loginRedirectMessage(redirectTarget, locale) ?? t("signInDefault");
  const destinationLabel = loginDestinationLabel(redirectTarget, locale);
  const switchAccount = firstParam(resolvedSearchParams.switch) === "1";
  const origins = getOrigins();
  const currentHost = webHostFromHeader((await headers()).get("host"), origins);
  const cookieStore = await cookies();
  const session = await resolveSessionSummaryFromToken(cookieStore.get(sessionCookieName)?.value);
  if (session && !switchAccount) {
    redirect(
      destinationToHref(resolvePostLoginDestination(session, redirectTarget), currentHost, origins),
    );
  }

  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="relative flex min-h-dvh flex-col overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--accent)_8%,transparent),transparent)]"
      />
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {redirectTarget ? (
            <a
              href={localizedRedirectTarget(redirectTarget, locale) ?? localizedPath("/", locale)}
              aria-label={t("back")}
              title={t("back")}
              className="zook-focus inline-grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </a>
          ) : null}
          <ZookLogo />
        </div>
        <a
          href={localizedPath("/login", nextLocale, {
            redirect: localizedRedirectTarget(redirectTarget, nextLocale),
            email: firstParam(resolvedSearchParams.email),
          })}
          className="zook-focus rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
        >
          {t("languageSwitch")}
        </a>
      </header>

      <div className="mx-auto grid w-full max-w-md flex-1 content-start gap-3 px-5 pb-8 pt-[clamp(1.25rem,5vh,3.5rem)]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t("signInTitle")}
          </h1>
          {destinationLabel ? (
            <p className="mx-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
              <span className="shrink-0 text-[var(--text-tertiary)]">{t("continuingTo")}</span>
              <span className="truncate text-[var(--text-primary)]">{destinationLabel}</span>
            </p>
          ) : null}
          {destinationLabel ? (
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-5 text-[var(--text-secondary)]">{headerCopy}</p>
          ) : null}
        </div>
        <Suspense fallback={<div className="glass-panel h-[360px] w-full rounded-[28px]" />}>
          <LoginPanel locale={locale} currentHost={currentHost} origins={origins} />
        </Suspense>
        <p className="text-center text-xs text-[var(--text-tertiary)]">
          <a href={localizedPath("/privacy", locale)} className="hover:text-[var(--text-secondary)] transition underline underline-offset-2">
            {t("privacy")}
          </a>
          {" · "}
          <a href={localizedPath("/terms", locale)} className="hover:text-[var(--text-secondary)] transition underline underline-offset-2">
            {t("terms")}
          </a>
        </p>
      </div>
    </main>
  );
}
