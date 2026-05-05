"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { ApiError } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import { ZookButton } from "./zook-button";

const OTP_RESEND_COOLDOWN_SECONDS = 30;

function sanitizeOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function looksLikePhoneInput(value: string) {
  return !value.includes("@") && /^[+\d\s().-]*$/.test(value);
}

function formatIndiaPhoneInput(value: string) {
  if (!looksLikePhoneInput(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const hasFormattedCountryCode = value.trimStart().startsWith("+91");
  const localDigits =
    hasFormattedCountryCode || (digits.startsWith("91") && digits.length === 12)
      ? digits.slice(2, 12)
      : digits.slice(0, 10);
  const first = localDigits.slice(0, 5);
  const second = localDigits.slice(5, 10);
  return second ? `+91 ${first} ${second}` : `+91 ${first}`;
}

export function LoginPanel() {
  const searchParams = useSearchParams();
  const initialIdentifier = searchParams.get("email") ?? "";
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [submitting, setSubmitting] = useState<"request" | "verify" | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(
    searchParams.get("redirect") === "/platform"
      ? "Sign in on web to continue to the platform dashboard."
      : "Enter your email or phone number to receive a one-time password.",
  );

  useEffect(() => {
    if (stage === "otp") {
      otpRef.current?.focus();
    }
  }, [stage]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function requestOtp({ resend = false }: { resend?: boolean } = {}) {
    if (resend && resendCooldown > 0) {
      return;
    }
    setSubmitting("request");
    try {
      const trimmedIdentifier = identifier.trim();
      if (looksLikePhoneInput(trimmedIdentifier)) {
        const digits = trimmedIdentifier.replace(/\D/g, "");
        if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) {
          setMessage("Enter a 10-digit India mobile number or use email.");
          setSubmitting(null);
          return;
        }
      }
      const payload = await webApiFetch<{ devOtp?: string }>("/api/auth/request-otp", {
        method: "POST",
        body: { identifier: trimmedIdentifier },
      });
      setMessage(
        payload.devOtp
          ? `${resend ? "Fresh OTP" : "OTP"} sent to ${trimmedIdentifier}. Test code: ${payload.devOtp}.`
          : `${resend ? "Fresh OTP" : "OTP"} sent to ${trimmedIdentifier}.`,
      );
      setIdentifier(trimmedIdentifier);
      setCode("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setStage("otp");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to send OTP.");
    } finally {
      setSubmitting(null);
    }
  }

  async function verifyOtp() {
    setSubmitting("verify");
    try {
      const trimmedIdentifier = identifier.trim();
      await webApiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: { identifier: trimmedIdentifier, code: sanitizeOtpCode(code) },
      });
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      window.location.href =
        safeRedirect ?? (trimmedIdentifier.startsWith("platform") ? "/platform" : "/dashboard");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to verify OTP.");
      setSubmitting(null);
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
        <label className="text-xs font-medium uppercase text-white/45">Email or phone</label>
        <input
          aria-label="Email or phone"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="+91 98765 43210 or you@example.com"
          value={identifier}
          onChange={(event) => setIdentifier(formatIndiaPhoneInput(event.target.value))}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
        {stage === "identifier" && looksLikePhoneInput(identifier) ? (
          <p className="text-xs leading-5 text-white/42">
            India mobile numbers are sent with the +91 country code.
          </p>
        ) : null}
        {stage === "otp" ? (
          <>
            <label className="text-xs font-medium uppercase text-white/45">OTP</label>
            <input
              ref={otpRef}
              aria-label="OTP"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(sanitizeOtpCode(event.target.value))}
              maxLength={6}
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </>
        ) : null}
      </div>
      <ZookButton
        onClick={stage === "identifier" ? () => void requestOtp() : () => void verifyOtp()}
        className="mt-6"
        disabled={submitting !== null || !identifier.trim() || (stage === "otp" && !code.trim())}
        fullWidth
        trailingIcon={<ArrowRight size={18} />}
      >
        {submitting === "request"
          ? "Sending OTP"
          : submitting === "verify"
            ? "Verifying"
            : stage === "identifier"
              ? "Send OTP"
              : "Verify and continue"}
      </ZookButton>
      {stage === "otp" ? (
        <div className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ZookButton
              onClick={() => void requestOtp({ resend: true })}
              disabled={submitting !== null || resendCooldown > 0}
              fullWidth
              size="md"
              tone="secondary"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
            </ZookButton>
            <ZookButton
              type="button"
              tone="ghost"
              fullWidth
              onClick={() => {
                setStage("identifier");
                setCode("");
                setResendCooldown(0);
              }}
              disabled={submitting !== null}
            >
              Change sign-in
            </ZookButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
