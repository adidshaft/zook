"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, RefreshCcw } from "lucide-react";
import QRCode from "qrcode";
import { GlassCard, Pill } from "./glass-card";
import { webApiFetch } from "@/lib/api-client";

export function AttendanceQrPanel({ orgId }: { orgId: string }) {
  const [qrPayload, setQrPayload] = useState<string>("");
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [qrRenderError, setQrRenderError] = useState<string>("");

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

  useEffect(() => {
    if (!qrPayload) {
      setQrImageUrl("");
      return;
    }

    let active = true;
    setQrRenderError("");
    void QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#070908",
        light: "#f6ffe2",
      },
    })
      .then((dataUrl) => {
        if (active) {
          setQrImageUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrRenderError("Unable to render the QR image. The signed token is still available.");
        }
      });

    return () => {
      active = false;
    };
  }, [qrPayload]);

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
          <span className="text-sm font-medium">Rolling signed QR</span>
        </div>
        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
        {!error ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="grid min-h-[300px] place-items-center rounded-[22px] border border-lime-200/25 bg-lime-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="Attendance QR code"
                  className="h-full max-h-[280px] w-full max-w-[280px] rounded-xl"
                />
              ) : (
                <p className="text-center text-sm font-medium text-black/60">
                  {qrPayload ? "Rendering QR..." : "Loading QR..."}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-4">
              <div>
                <p className="text-sm leading-6 text-white/58">
                  Display this code at reception or the entry gate. Members scan it from the mobile
                  app and receive a short entry code for the desk.
                </p>
                {qrRenderError ? <p className="mt-3 text-sm text-red-200">{qrRenderError}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="lime">Backend signed</Pill>
                <Pill>Default Branch</Pill>
                {expiresAt ? <Pill>Expires {new Date(expiresAt).toLocaleTimeString()}</Pill> : null}
              </div>
              <details className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <summary className="cursor-pointer text-sm font-medium text-white/72">
                  Show signed token
                </summary>
                <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
                  {qrPayload || "Loading token..."}
                </pre>
              </details>
            </div>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
