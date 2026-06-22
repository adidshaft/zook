import { headers } from "next/headers";
import Link from "next/link";
import { PublicNav } from "@/components/public/nav/public-nav";
import {
  localizedPath,
  publicT,
  resolvePublicLocaleFromHeader,
} from "@/lib/public-i18n";

export default async function NotFound() {
  const locale = resolvePublicLocaleFromHeader((await headers()).get("accept-language"));
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
            Not found
          </p>
          <h1 className="mb-2 text-2xl font-black text-[var(--text-primary)]">This page does not exist</h1>
          <p className="mb-6 text-sm leading-6 text-[var(--text-secondary)]">
            The link may be old, unpublished, or only available after signing in.
          </p>
          <Link
            href={localizedPath("/", locale)}
            className="zook-focus inline-flex items-center gap-2 rounded-xl bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
          >
            {publicT(locale, "home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
