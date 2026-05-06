"use client";

import { Share2 } from "lucide-react";

export function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
    >
      <Share2 size={16} />
      Share
    </button>
  );
}
