"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function MemberPrivateLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
          Your private link
        </p>
        <p className="mt-1 break-all text-sm text-white/70">{url}</p>
        <p className="mt-1 text-xs text-white/42">Only you can see this when signed in.</p>
      </div>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="zook-focus inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-200"
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
