import { headers } from "next/headers";
import Link from "next/link";
import { PublicNav } from "@/components/public/nav/public-nav";
import {
  localizedPath,
  publicT,
  resolvePublicLocale,
  resolvePublicLocaleFromHeader,
} from "@/lib/public-i18n";

const notFoundCopy = {
  en: {
    eyebrow: "Not found",
    title: "This page does not exist",
    body: "The link may be old, unpublished, or only available after signing in.",
    findGym: "Find a gym",
  },
  hi: {
    eyebrow: "पेज नहीं मिला",
    title: "यह पेज मौजूद नहीं है",
    body: "लिंक पुराना हो सकता है, अभी प्रकाशित नहीं है, या लॉगिन के बाद ही खुलता है.",
    findGym: "जिम खोजें",
  },
} as const;

export default async function NotFound() {
  const requestHeaders = await headers();
  const localeFromQuery = resolvePublicLocale(
    Object.fromEntries(new URLSearchParams(requestHeaders.get("x-zook-search") ?? "")),
  );
  const locale =
    localeFromQuery === "hi"
      ? "hi"
      : resolvePublicLocaleFromHeader(requestHeaders.get("accept-language"));
  const copy = notFoundCopy[locale];
  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--text-primary)]"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 sm:px-6">
        <PublicNav locale={locale} />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="max-w-sm text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            {copy.eyebrow}
          </p>
          <h1 className="mb-2 text-2xl font-black text-[var(--text-primary)]">{copy.title}</h1>
          <p className="mb-6 text-sm leading-6 text-[var(--text-secondary)]">
            {copy.body}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={localizedPath("/", locale)}
              className="zook-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
            >
              {publicT(locale, "home")}
            </Link>
            <Link
              href={localizedPath("/gyms", locale)}
              className="zook-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              {copy.findGym}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
