"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { ApiError } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";

export function LoginPanel() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "owner@zook.local";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("000000");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [message, setMessage] = useState(
    searchParams.get("redirect") === "/platform"
      ? "Sign in on web to continue to the platform control room."
      : "Use the seeded accounts with development OTP 000000.",
  );

  async function requestOtp() {
    try {
      const payload = await webApiFetch<{ devOtp?: string }>("/api/auth/request-otp", {
        method: "POST",
        body: { email },
      });
      setMessage(
        payload.devOtp
          ? `OTP sent to ${email}. Dev code is ${payload.devOtp}.`
          : `OTP sent to ${email}.`,
      );
      setStage("otp");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to send OTP.");
    }
  }

  async function verifyOtp() {
    try {
      await webApiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: { email, code },
      });
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      window.location.href =
        safeRedirect ?? (email.startsWith("platform") ? "/platform" : "/dashboard");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to verify OTP.");
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
