import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ZookLogo } from "./zook-logo";

export function PublicNav({
  loginHref = "/login",
  loginLabel = "Login",
  showLogin = true,
  languageHref,
  languageLabel = "हिन्दी",
  backHref,
  backLabel = "Back",
}: {
  loginHref?: string;
  loginLabel?: string;
  showLogin?: boolean;
  languageHref?: string;
  languageLabel?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 py-4">
      <ZookLogo />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {languageHref ? (
          <Link
            href={languageHref}
            className="zook-focus inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8"
          >
            {languageLabel}
          </Link>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            className="zook-focus inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </Link>
        ) : null}
        {showLogin ? (
          <Link
            href={loginHref}
            className="zook-focus inline-flex min-h-10 items-center rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-200"
          >
            {loginLabel}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
