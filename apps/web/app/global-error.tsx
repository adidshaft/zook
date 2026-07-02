"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return;
    }

    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error);
      })
      .catch(() => {});
  }, [error]);

  return (
    <html lang="en-IN">
      <body>
        <main className="min-h-dvh bg-[#070908] px-4 py-10 text-white">
          <section className="mx-auto max-w-xl rounded-[28px] border border-red-300/25 bg-red-300/10 p-6">
            <p className="text-sm font-semibold text-red-100">
              Something went wrong.
              <span className="mt-1 block text-red-100/80">कुछ गड़बड़ हुई.</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-red-100/75">
              Try again first. If it keeps happening, contact support with request ID{" "}
              <span className="font-semibold text-red-50">{error.digest ?? "not available"}</span>.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="zook-focus inline-flex min-h-11 items-center rounded-full bg-lime-300 px-5 text-sm font-semibold text-black"
              >
                Try again
              </button>
              <a
                href="/"
                className="zook-focus inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-red-50 transition hover:bg-white/10"
              >
                Home
              </a>
              <a
                href="/support"
                className="zook-focus inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-red-50 transition hover:bg-white/10"
              >
                Support
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
