"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import type { PublicLocale } from "@/lib/public-i18n";

type RenewResponse = {
  checkoutUrl?: string | null;
  session?: { id?: string } | null;
};

const copy = {
  en: {
    idle: "Renew membership",
    busy: "Starting renewal...",
    error: "Unable to start renewal.",
  },
  hi: {
    idle: "सदस्यता रिन्यू करें",
    busy: "रिन्यूअल शुरू हो रहा है...",
    error: "रिन्यूअल शुरू नहीं हो पाया.",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

export function MemberRenewButton({
  subscriptionId,
  locale = "en",
}: {
  subscriptionId: string;
  locale?: PublicLocale;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renew() {
    setBusy(true);
    setError(null);
    try {
      const payload = await webApiFetch<RenewResponse>(
        `/api/me/memberships/${subscriptionId}/renew`,
        {
          method: "POST",
          feedback: {
            success: false,
            error: false,
          },
        },
      );
      const checkoutUrl =
        payload?.checkoutUrl ??
        (payload?.session?.id ? `/checkout/${payload.session.id}` : null);
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      router.refresh();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : t.error;
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void renew()}
        disabled={busy}
        className="zook-focus inline-flex min-h-10 items-center gap-2 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-black/60 border-t-transparent" />
        ) : (
          <RefreshCcw size={16} aria-hidden="true" />
        )}
        {busy ? t.busy : t.idle}
      </button>
      {error ? (
        <p role="alert" aria-live="polite" className="max-w-xs text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
