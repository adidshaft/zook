"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, RefreshCcw } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";

export function AttendanceQrPanel({ orgId }: { orgId: string }) {
  const [qrPayload, setQrPayload] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [error, setError] = useState<string>("");

  const loadToken = useCallback(async () => {
    try {
      setError("");
      const payload = await webApiFetch<{ qrPayload: string; expiresAt: string }>(
        `/api/orgs/${orgId}/attendance/qr-token`,
        { method: "POST" }
      );
      setQrPayload(payload.qrPayload);
      setExpiresAt(payload.expiresAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load attendance QR token.");
    }
  }, [orgId]);

  useEffect(() => {
    void loadToken();
    const timer = window.setInterval(() => {
      void loadToken();
    }, 120_000);
    return () => window.clearInterval(timer);
  }, [loadToken]);

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Live attendance token</h2>
          <p className="mt-1 text-sm text-white/45">
            Default Branch QR for the mobile scanner or simulator paste flow.
          </p>
        </div>
        <button
          onClick={() => void loadToken()}
          className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>
      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/30 p-5">
        <div className="flex items-center gap-2 text-lime-200">
          <QrCode size={18} />
          <span className="text-sm font-medium">Rolling signed token</span>
        </div>
        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
        {!error ? (
          <>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/70">
              {qrPayload || "Loading token..."}
            </pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="lime">Backend signed</Pill>
              <Pill>Default Branch</Pill>
              {expiresAt ? <Pill>Expires {new Date(expiresAt).toLocaleTimeString()}</Pill> : null}
            </div>
          </>
        ) : null}
      </div>
    </GlassCard>
  );
}
