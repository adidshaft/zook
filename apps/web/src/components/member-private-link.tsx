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
    <div className="mt-3 flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-xs text-white/40" title={url}>
        {url}
      </p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="zook-focus inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:text-white/90"
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
