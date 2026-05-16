"use client";

import { Copy, Smartphone } from "lucide-react";
import { useState } from "react";
import { ZookButton } from "@/components/zook-button";

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
      <ZookButton
        type="button"
        tone="secondary"
        fullWidth
        onClick={openInApp}
        leadingIcon={<Smartphone size={17} />}
      >
        {openLabel}
      </ZookButton>
      <ZookButton
        type="button"
        tone="ghost"
        fullWidth
        onClick={() => void copyJoinLink()}
        leadingIcon={<Copy size={16} />}
      >
        {copied ? copiedLabel : copyLabel}
      </ZookButton>
    </div>
  );
}
