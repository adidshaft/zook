"use client";

import { webApiFetch } from "@/lib/api-client";

export function ImpersonationBanner({
  id,
  targetEmail,
  adminEmail,
  expiresAt,
}: {
  id: string;
  targetEmail: string;
  adminEmail?: string | null;
  expiresAt: string;
}) {
  async function endImpersonation() {
    await webApiFetch(`/api/platform/impersonations/${id}/end`, { method: "POST", body: {} });
    window.location.href = "/platform/impersonations";
  }

  return (
    <div className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-red-200/30 bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-lg">
      <span>
        Impersonating {targetEmail}
        {adminEmail ? ` as ${adminEmail}` : ""} until {new Date(expiresAt).toLocaleTimeString()}
      </span>
      <button
        type="button"
        onClick={() => void endImpersonation()}
        className="rounded-full border border-white/50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white"
      >
        End impersonation
      </button>
    </div>
  );
}
