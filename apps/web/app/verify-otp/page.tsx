import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/login-panel";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getOrigins, webHostFromHeader } from "@/lib/origins";
import { publicSocialImage } from "@/lib/public-metadata";

export const metadata: Metadata = {
  title: "Verify OTP | Zook",
  description: "Verify your one-time code to continue signing in to Zook.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/verify-otp" },
  openGraph: {
    title: "Verify OTP on Zook",
    description: "Verify your one-time code to continue signing in to Zook.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Verify OTP on Zook" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Verify OTP on Zook",
    description: "Verify your one-time code to continue signing in to Zook.",
    images: [publicSocialImage()],
  },
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRedirectTarget(value?: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function sanitizeOtpCode(value?: string | null) {
  return value?.replace(/\D/g, "").slice(0, 6) ?? "";
}

function normalizeIdentifier(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const locale = resolvePublicLocale(resolvedSearchParams);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const identifier = normalizeIdentifier(firstParam(resolvedSearchParams.identifier));
  const redirectTarget = safeRedirectTarget(firstParam(resolvedSearchParams.redirect));
  const code = sanitizeOtpCode(firstParam(resolvedSearchParams.code));

  if (!identifier) {
    redirect(localizedPath("/login", locale, { redirect: redirectTarget }));
  }

  const origins = getOrigins();
  const currentHost = webHostFromHeader((await headers()).get("host"), origins);

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
          href={localizedPath("/verify-otp", nextLocale, {
            redirect: redirectTarget,
            identifier,
            code,
          })}
          className="zook-focus rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] transition"
        >
          {t("languageSwitch")}
        </a>
      </div>
      <div className="grid w-full max-w-md gap-4">
        <Suspense fallback={<div className="glass-panel h-[360px] w-full rounded-[28px]" />}>
          <LoginPanel
            locale={locale}
            currentHost={currentHost}
            origins={origins}
            initialIdentifier={identifier}
            initialCode={code}
            initialStage="otp"
          />
        </Suspense>
      </div>
    </main>
  );
}
