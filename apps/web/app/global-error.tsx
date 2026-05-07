"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body>
        <main className="min-h-dvh bg-[#070908] px-4 py-10 text-white">
          <section className="mx-auto max-w-xl rounded-[28px] border border-red-300/25 bg-red-300/10 p-6">
            <p className="text-sm font-semibold text-red-100">Something went wrong.</p>
            <p className="mt-2 text-sm text-red-100/75">
              Refresh this page and share request ID {error.digest ?? "not available"} if it keeps
              happening.
            </p>
            <button
              type="button"
              onClick={reset}
              className="zook-focus mt-5 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
