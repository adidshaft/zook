"use client";

import { useState } from "react";
import { webApiFetch } from "@/lib/api-client";

export function DashboardLocaleToggle({ locale }: { locale?: string | undefined }) {
  const [currentLocale, setCurrentLocale] = useState(locale === "hi" ? "hi" : "en");
  const [busy, setBusy] = useState(false);

  async function updateLocale(nextLocale: "en" | "hi") {
    if (nextLocale === currentLocale || busy) {
      return;
    }
    setBusy(true);
    try {
      await webApiFetch("/api/me/profile", {
        method: "PATCH",
        body: { preferredLocale: nextLocale },
      });
      setCurrentLocale(nextLocale);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex rounded-full border border-white/10 bg-black/20 p-1" aria-label="Language">
      {(["en", "hi"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => void updateLocale(item)}
          disabled={busy}
          className={`zook-focus min-h-8 rounded-full px-3 text-xs font-semibold transition ${
            currentLocale === item ? "bg-lime-300 text-black" : "text-white/55 hover:text-white"
          }`}
        >
          {item === "en" ? "EN" : "हिन्दी"}
        </button>
      ))}
    </div>
  );
}
