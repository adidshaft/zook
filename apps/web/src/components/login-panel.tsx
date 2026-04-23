"use client";

import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";

export function LoginPanel() {
  const [email, setEmail] = useState("owner@zook.local");
  const [code, setCode] = useState("000000");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [message, setMessage] = useState("Use the seeded accounts with development OTP 000000.");

  async function requestOtp() {
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    const payload = await response.json();
    setMessage(payload.ok ? `OTP sent to ${email}. Dev code is 000000.` : payload.error.message);
    if (payload.ok) setStage("otp");
  }

  async function verifyOtp() {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const payload = await response.json();
    if (payload.ok) {
      window.location.href = email.startsWith("platform") ? "/platform" : "/dashboard";
    } else {
      setMessage(payload.error.message);
    }
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-[28px] p-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-black">
        <Mail size={22} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to Zook</h1>
      <p className="mt-2 text-sm leading-6 text-white/55">{message}</p>
      <div className="mt-6 grid gap-3">
        <label className="text-xs font-medium uppercase text-white/45">Email</label>
        <input
          aria-label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
        {stage === "otp" ? (
          <>
            <label className="text-xs font-medium uppercase text-white/45">OTP</label>
            <input
              aria-label="OTP"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </>
        ) : null}
      </div>
      <button
        onClick={stage === "email" ? requestOtp : verifyOtp}
        className="zook-focus mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
      >
        {stage === "email" ? "Send OTP" : "Verify and continue"}
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
