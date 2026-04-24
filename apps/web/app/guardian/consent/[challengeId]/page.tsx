"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

type GuardianConsentPayload = {
  challenge: {
    id: string;
    status: string;
    expiresAt?: string;
    verifiedAt?: string | null;
    failureReason?: string | null;
    canResend?: boolean;
  };
  consent?: {
    guardianName?: string | null;
    relationship?: string | null;
  };
  minor?: {
    firstName?: string | null;
  };
  org?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

async function apiFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json()) as { ok: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload.data;
}

export default function GuardianConsentPage({
  params
}: {
  params: { challengeId: string };
}) {
  const [data, setData] = useState<GuardianConsentPayload | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const payload = await apiFetch<GuardianConsentPayload>(`/api/guardian-consent/${params.challengeId}`);
      setData(payload);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load guardian consent request.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params.challengeId]);

  const statusTone = useMemo(() => {
    if (data?.challenge.status === "VERIFIED") {
      return "text-lime-200";
    }
    if (data?.challenge.status === "EXPIRED" || data?.challenge.status === "FAILED") {
      return "text-amber-200";
    }
    return "text-sky-100";
  }, [data?.challenge.status]);

  async function verify() {
    setSubmitting(true);
    try {
      await apiFetch(`/api/guardian-consent/${params.challengeId}/verify`, {
        method: "POST",
        body: JSON.stringify({ code })
      });
      setMessage("Guardian consent verified successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify guardian OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setSubmitting(true);
    try {
      await apiFetch(`/api/guardian-consent/${params.challengeId}/resend`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage("A fresh guardian OTP has been sent.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resend guardian OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10">
      <section className="glass-panel grid w-full gap-6 rounded-[32px] p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-lime-200">
            <ShieldCheck size={14} />
            Zook Guardian Consent
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/45">Minor member</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {data?.minor?.firstName ?? "Minor member"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              Guardian consent allows Zook to activate membership and attendance for this minor member. Personalized AI remains minor-safe, and marketing stays off unless consent is explicitly granted later.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/70 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Requesting gym</div>
              <div className="mt-2 text-base font-medium text-white">{data?.org?.name ?? "Zook"}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Relationship</div>
              <div className="mt-2 text-base font-medium text-white">{data?.consent?.relationship ?? "Guardian"}</div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
            <p>Before consent: membership activation, attendance check-in, trainer-driven personalization, and personalized AI stay blocked.</p>
            <p>After consent: membership and attendance can proceed, AI still uses minor-safe behavior, and promotional messaging remains off by default.</p>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-white/65">
              <LoaderCircle className="animate-spin" size={18} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 text-sm font-medium ${statusTone}`}>
                {data?.challenge.status === "VERIFIED" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                Status: {data?.challenge.status ?? "UNKNOWN"}
              </div>
              {data?.challenge.expiresAt ? (
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                  Expires {new Date(data.challenge.expiresAt).toLocaleString("en-IN")}
                </p>
              ) : null}
              {message ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">{message}</p> : null}
              {data?.challenge.status === "VERIFIED" ? (
                <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-100">
                  Guardian consent has already been verified for this request.
                </div>
              ) : (
                <>
                  <label className="grid gap-2 text-sm text-white/70">
                    Guardian OTP
                    <input
                      aria-label="Guardian OTP"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                      placeholder="Enter 6-digit code"
                    />
                  </label>
                  <button
                    onClick={verify}
                    disabled={submitting || code.trim().length !== 6}
                    className="zook-focus flex w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                    Verify consent
                  </button>
                  <button
                    onClick={resend}
                    disabled={submitting || data?.challenge.canResend === false}
                    className="zook-focus flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={16} />
                    Resend OTP
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
