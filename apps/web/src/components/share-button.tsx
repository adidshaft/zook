"use client";

import { Share2 } from "lucide-react";
import { ZookButton } from "@/components/zook-button";

export function ShareButton({
  title,
  text,
  path,
  label = "Share",
}: {
  title: string;
  text: string;
  path: string;
  label?: string;
}) {
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  return (
    <ZookButton
      type="button"
      tone="ghost"
      size="sm"
      onClick={() => void share()}
      leadingIcon={<Share2 size={16} />}
    >
      {label}
    </ZookButton>
  );
}
