"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import type { PublicLocale } from "@/lib/public-i18n";

type AutopayResponse = {
  checkoutUrl?: string | null;
  session?: { id?: string } | null;
};

const copy = {
  en: {
    idle: "Enable autopay",
    busy: "Starting...",
    done: "Autopay is ready.",
    error: "Unable to start autopay.",
  },
  hi: {
    idle: "ऑटो-पे चालू करें",
    busy: "शुरू हो रहा है...",
    done: "ऑटो-पे तैयार है.",
    error: "ऑटो-पे शुरू नहीं हो पाया.",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

export function MemberAutopayButton({
  subscriptionId,
  locale,
}: {
  subscriptionId: string;
  locale: PublicLocale;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "danger">("success");

  async function startAutopay() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await webApiFetch<AutopayResponse>(
        `/api/me/memberships/${subscriptionId}/autopay`,
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
      setTone("success");
      setMessage(t.done);
      router.refresh();
    } catch (cause) {
      const errorMessage =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : t.error;
      setTone("danger");
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex w-full max-w-full flex-col items-start gap-1.5 sm:w-auto">
      <button
        type="button"
        onClick={() => void startAutopay()}
        disabled={busy}
        className="zook-focus inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black transition hover:bg-lime-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
      >
        {busy ? (
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-lime-100/70 border-t-transparent" />
        ) : (
          <Zap size={16} aria-hidden="true" className="shrink-0" />
        )}
        <span className="truncate">{busy ? t.busy : t.idle}</span>
      </button>
      {message ? (
        <p
          role={tone === "danger" ? "alert" : "status"}
          aria-live="polite"
          className={`max-w-xs text-xs ${tone === "danger" ? "text-red-300" : "text-lime-200"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
