"use client";

import { Copy, Smartphone } from "lucide-react";
import { useState } from "react";

export function PublicGymActions({
  username,
  appStoreUrl,
  playStoreUrl,
  openLabel,
  copyLabel,
  copiedLabel,
}: {
  username: string;
  appStoreUrl?: string | null;
  playStoreUrl?: string | null;
  openLabel: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const fallbackUrl = appStoreUrl || playStoreUrl || "/";

  async function copyJoinLink() {
    const url = new URL(`/join/${username}`, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function openInApp() {
    window.location.href = `zook://join/${username}`;
    window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.location.href = fallbackUrl;
      }
    }, 1000);
  }

  return (
    <div className="mt-3 grid gap-2">
      <button
        type="button"
        onClick={openInApp}
        className="zook-focus inline-flex w-full items-center justify-center gap-2 rounded-xl border border-lime-300 px-5 py-3 text-sm font-medium text-lime-200 transition hover:bg-lime-300/10"
      >
        <Smartphone size={17} />
        {openLabel}
      </button>
      <button
        type="button"
        onClick={() => void copyJoinLink()}
        className="zook-focus inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/72 transition hover:bg-white/8"
      >
        <Copy size={16} />
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
