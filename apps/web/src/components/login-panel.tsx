"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { ApiError, parseApiResponse } from "@zook/core";
import { ZookButton } from "./zook-button";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const isDev = process.env.NODE_ENV === "development";

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

function rateLimitMessage(response: Response, locale: PublicLocale) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
  return { seconds, message: publicT(locale, "tooManyAttempts", { seconds }) };
}

function resolvePostLoginPath(
  session: {
    user?: { isPlatformAdmin?: boolean };
    activeOrgId?: string;
  } | undefined,
  requestedPath: string | null,
) {
  if (requestedPath?.startsWith("/platform")) {
    return session?.user?.isPlatformAdmin ? requestedPath : "/dashboard";
  }
  if (requestedPath) {
    return requestedPath;
  }
  if (session?.user?.isPlatformAdmin) {
    return "/platform";
  }
  return session?.activeOrgId ? "/dashboard" : "/gyms";
}

export function LoginPanel({ locale = "en" }: { locale?: PublicLocale }) {
  const searchParams = useSearchParams();
  const t = (key: Parameters<typeof publicT>[1], replacements: Record<string, string | number> = {}) =>
    publicT(locale, key, replacements);
  const initialIdentifier = searchParams.get("email") ?? "";
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [submitting, setSubmitting] = useState<"request" | "verify" | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(
    searchParams.get("redirect") === "/platform"
      ? t("signInPlatform")
      : t("signInDefault"),
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
          setMessage(t("invalidIndiaPhone"));
          setSubmitting(null);
          return;
        }
      }
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({ identifier: trimmedIdentifier }),
      });
      const payload = await parseApiResponse<{ devOtp?: string }>(response).catch((error) => {
        if (error instanceof ApiError && error.status === 429) {
          const limited = rateLimitMessage(response, locale);
          setResendCooldown(limited.seconds);
          throw new Error(limited.message);
        }
        throw error;
      });
      setMessage(
        isDev && payload.devOtp
          ? `${t(resend ? "freshOtpSent" : "otpSent", { identifier: trimmedIdentifier })} ${t(
              "testCode",
              { code: payload.devOtp },
            )}`
          : t(resend ? "freshOtpSent" : "otpSent", { identifier: trimmedIdentifier }),
      );
      setIdentifier(trimmedIdentifier);
      setCode("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setStage("otp");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("unableSendOtp"));
    } finally {
      setSubmitting(null);
    }
  }

  async function verifyOtp(overrideCode?: string) {
    setSubmitting("verify");
    try {
      const trimmedIdentifier = identifier.trim();
      const otpCode = sanitizeOtpCode(overrideCode ?? code);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({ identifier: trimmedIdentifier, code: otpCode }),
      });
      const payload = await parseApiResponse<{
        session?: { user?: { isPlatformAdmin?: boolean }; activeOrgId?: string };
      }>(response).catch((error) => {
        if (error instanceof ApiError && error.status === 429) {
          throw new Error(rateLimitMessage(response, locale).message);
        }
        throw error;
      });
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      window.location.href = resolvePostLoginPath(payload.session, safeRedirect);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("unableVerifyOtp"));
      setSubmitting(null);
    }
  }

  function handleOtpChange(value: string) {
    const nextCode = sanitizeOtpCode(value);
    setCode(nextCode);
    if (nextCode.length === 6 && submitting === null) {
      void verifyOtp(nextCode);
    }
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-[28px] p-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-black">
        <Mail size={22} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{t("signInTitle")}</h1>
      <p className="mt-2 text-sm leading-6 text-white/55" role="alert" aria-live="polite">
        {message}
      </p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (stage === "identifier") {
            void requestOtp();
          } else {
            void verifyOtp();
          }
        }}
      >
        <label htmlFor="login-identifier" className="text-xs font-medium uppercase text-white/45">
          {t("emailOrPhone")}
        </label>
        <input
          id="login-identifier"
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
            {t("indiaPhoneHint")}
          </p>
        ) : null}
        {stage === "otp" ? (
          <>
            <label htmlFor="login-otp" className="text-xs font-medium uppercase text-white/45">
              {t("otp")}
            </label>
            <input
              id="login-otp"
              ref={otpRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(event) => handleOtpChange(event.target.value)}
              maxLength={6}
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </>
        ) : null}
        {stage === "otp" && resendCooldown > 0 ? (
          <p className="text-xs leading-5 text-white/45" aria-live="polite">
            {t("resendAvailable", { seconds: resendCooldown })}
          </p>
        ) : null}
        <ZookButton
          type="submit"
          className="mt-6"
          disabled={submitting !== null || !identifier.trim() || (stage === "otp" && !code.trim())}
          fullWidth
          trailingIcon={<ArrowRight size={18} />}
        >
          {submitting === "request"
            ? t("sendingOtp")
            : submitting === "verify"
              ? t("verifying")
              : stage === "identifier"
                ? t("sendOtp")
                : t("verifyContinue")}
        </ZookButton>
      </form>
      {stage === "otp" ? (
        <div className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ZookButton
              type="button"
              onClick={() => void requestOtp({ resend: true })}
              disabled={submitting !== null || resendCooldown > 0}
              fullWidth
              size="md"
              tone="secondary"
            >
              {resendCooldown > 0 ? t("resendUnavailable") : t("resendOtp")}
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
              {t("changeSignIn")}
            </ZookButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
