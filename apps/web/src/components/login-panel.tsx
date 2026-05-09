"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail, Smartphone } from "lucide-react";
import { ApiError, parseApiResponse } from "@zook/core";
import { toast } from "sonner";
import { ZookButton } from "./zook-button";
import { resolvePostLoginPath } from "@/lib/auth-destinations";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup";
          }) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth?: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{ authorization?: { id_token?: string } }>;
      };
    };
  }
}

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const isDev = process.env.NODE_ENV === "development";
type LoginMethod = "phone" | "email";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Sign-in provider could not load."));
    if (!existing) {
      document.head.appendChild(script);
    }
  });
}

function sanitizeOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function sanitizeIndianMobile(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\D/g, "")
    .replace(/^91(?=[6-9][0-9]{9}$)/, "")
    .slice(0, 10);
}

function isValidIndianMobile(value: string) {
  return /^[6-9][0-9]{9}$/.test(value);
}

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function rateLimitMessage(response: Response, locale: PublicLocale) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
  return { seconds, message: publicT(locale, "tooManyAttempts", { seconds }) };
}

export function LoginPanel({ locale = "en" }: { locale?: PublicLocale }) {
  const searchParams = useSearchParams();
  const t = (
    key: Parameters<typeof publicT>[1],
    replacements: Record<string, string | number> = {},
  ) => publicT(locale, key, replacements);
  const initialIdentifier = searchParams.get("email") ?? "";
  const [method, setMethod] = useState<LoginMethod>(
    initialIdentifier.includes("@") ? "email" : "phone",
  );
  const [email, setEmail] = useState(initialIdentifier.includes("@") ? initialIdentifier : "");
  const [phoneNumber, setPhoneNumber] = useState(
    initialIdentifier && !initialIdentifier.includes("@")
      ? sanitizeIndianMobile(initialIdentifier)
      : "",
  );
  const [identifier, setIdentifier] = useState(
    initialIdentifier && !initialIdentifier.includes("@")
      ? `+91${sanitizeIndianMobile(initialIdentifier)}`
      : initialIdentifier,
  );
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [submitting, setSubmitting] = useState<"request" | "verify" | null>(null);
  const [ssoSubmitting, setSsoSubmitting] = useState<"google" | "apple" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(
    searchParams.get("redirect") === "/platform" ? t("signInPlatform") : t("signInDefault"),
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (stage === "identifier") {
      const timer = window.setTimeout(() => {
        if (method === "phone") {
          phoneRef.current?.focus();
        } else {
          emailRef.current?.focus();
        }
      }, 80);
      return () => window.clearTimeout(timer);
    }
    if (stage === "otp") {
      otpRef.current?.focus();
    }
    return undefined;
  }, [method, stage]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function selectedIdentifier() {
    if (method === "phone") {
      return `+91${sanitizeIndianMobile(phoneNumber)}`;
    }
    return email.trim().toLowerCase();
  }

  async function requestOtp({ resend = false }: { resend?: boolean } = {}) {
    if (resend && resendCooldown > 0) {
      return;
    }
    setSubmitting("request");
    try {
      const trimmedIdentifier = selectedIdentifier();
      if (method === "phone") {
        if (!isValidIndianMobile(phoneNumber)) {
          setMessage(t("invalidIndiaPhone"));
          setSubmitting(null);
          return;
        }
      } else if (!isValidEmail(trimmedIdentifier)) {
        setMessage(t("invalidEmail"));
        setSubmitting(null);
        return;
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
      toast.success(t(resend ? "freshOtpSent" : "otpSent", { identifier: trimmedIdentifier }));
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : t("unableSendOtp");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setSubmitting(null);
    }
  }

  async function verifyOtp(overrideCode?: string) {
    setSubmitting("verify");
    try {
      const trimmedIdentifier = identifier.trim() || selectedIdentifier();
      const otpCode = sanitizeOtpCode(overrideCode ?? code);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({ identifier: trimmedIdentifier, code: otpCode }),
      });
      const payload = await parseApiResponse<{
        session?: Parameters<typeof resolvePostLoginPath>[0];
      }>(response).catch((error) => {
        if (error instanceof ApiError && error.status === 429) {
          throw new Error(rateLimitMessage(response, locale).message);
        }
        throw error;
      });
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      toast.success(t("verifyContinue"));
      window.location.href = resolvePostLoginPath(payload.session, safeRedirect);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : t("unableVerifyOtp");
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSubmitting(null);
    }
  }

  async function completeSsoSignIn(
    provider: "google" | "apple",
    body: { idToken: string } | { identityToken: string },
  ) {
    setSsoSubmitting(provider);
    try {
      const response = await fetch(`/api/auth/${provider}/callback`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify(body),
      });
      const payload = await parseApiResponse<{
        session?: Parameters<typeof resolvePostLoginPath>[0];
      }>(response);
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      toast.success(t("verifyContinue"));
      window.location.href = resolvePostLoginPath(payload.session, safeRedirect);
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Sign-in could not be completed.";
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSsoSubmitting(null);
    }
  }

  async function signInWithGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!clientId) {
      setMessage("Google sign-in is not configured yet.");
      return;
    }
    setSsoSubmitting("google");
    try {
      await loadScript("https://accounts.google.com/gsi/client");
      if (!window.google?.accounts?.id) {
        throw new Error("Google sign-in is unavailable right now.");
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: (response) => {
          if (!response.credential) {
            setSsoSubmitting(null);
            setMessage("Google did not return a sign-in token. Try again.");
            return;
          }
          void completeSsoSignIn("google", { idToken: response.credential });
        },
      });
      window.google.accounts.id.prompt();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Google sign-in failed.";
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSsoSubmitting(null);
    }
  }

  async function signInWithApple() {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID?.trim();
    const redirectURI =
      process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI?.trim() || `${window.location.origin}/login`;
    if (!clientId) {
      setMessage("Apple sign-in is not configured yet.");
      return;
    }
    setSsoSubmitting("apple");
    try {
      await loadScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
      );
      if (!window.AppleID?.auth) {
        throw new Error("Apple sign-in is unavailable right now.");
      }
      window.AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI,
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      const identityToken = result.authorization?.id_token;
      if (!identityToken) {
        throw new Error("Apple did not return a sign-in token. Try again.");
      }
      await completeSsoSignIn("apple", { identityToken });
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Apple sign-in failed.";
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSsoSubmitting(null);
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
        {stage === "identifier" ? (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1">
              <button
                type="button"
                className={`zook-focus flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                  method === "phone"
                    ? "border border-lime-300/40 bg-lime-300/15 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
                aria-pressed={method === "phone"}
                disabled={!hydrated || submitting !== null}
                onClick={() => {
                  setMethod("phone");
                  setMessage(t("signInDefault"));
                }}
              >
                <Smartphone size={16} />
                {t("phone")}
              </button>
              <button
                type="button"
                className={`zook-focus flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                  method === "email"
                    ? "border border-lime-300/40 bg-lime-300/15 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
                aria-pressed={method === "email"}
                disabled={!hydrated || submitting !== null}
                onClick={() => {
                  setMethod("email");
                  setMessage(t("signInDefault"));
                }}
              >
                <Mail size={16} />
                {t("email")}
              </button>
            </div>
            {method === "phone" ? (
              <div className="grid gap-2">
                <label
                  htmlFor="login-phone"
                  className="text-xs font-medium uppercase text-white/45"
                >
                  {t("mobileNumber")}
                </label>
                <div className="grid grid-cols-[auto,1fr] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <div className="flex items-center border-r border-white/10 px-4 text-sm font-semibold text-lime-200">
                    +91
                  </div>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    ref={phoneRef}
                    required
                    disabled={!hydrated || submitting !== null}
                    onChange={(event) => {
                      setPhoneNumber(sanitizeIndianMobile(event.target.value));
                    }}
                    className="zook-focus bg-transparent px-4 py-3 text-white outline-none"
                  />
                </div>
                <p className="text-xs leading-5 text-white/42">{t("indiaPhoneHint")}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <label
                  htmlFor="login-email"
                  className="text-xs font-medium uppercase text-white/45"
                >
                  {t("emailAddress")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  ref={emailRef}
                  required
                  disabled={!hydrated || submitting !== null}
                  onChange={(event) => setEmail(event.target.value)}
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
                <p className="text-xs leading-5 text-white/42">{t("emailHint")}</p>
              </div>
            )}
          </>
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
          <div className="grid gap-2" aria-live="polite">
            <p className="text-xs leading-5 text-white/45">
              {t("resendAvailable", { seconds: resendCooldown })}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime-300 transition-all"
                style={{
                  width: `${((OTP_RESEND_COOLDOWN_SECONDS - resendCooldown) / OTP_RESEND_COOLDOWN_SECONDS) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        <ZookButton
          type="submit"
          className="mt-6"
          disabled={
            !hydrated ||
            submitting !== null ||
            ssoSubmitting !== null ||
            (stage === "otp" && !code.trim())
          }
          fullWidth
          state={submitting === null ? "idle" : "loading"}
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
      {stage === "identifier" ? (
        <div className="mt-5 grid gap-3">
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            <span>or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ZookButton
              type="button"
              tone="secondary"
              fullWidth
              onClick={() => void signInWithApple()}
              disabled={!hydrated || submitting !== null || ssoSubmitting !== null}
              state={ssoSubmitting === "apple" ? "loading" : "idle"}
            >
              Apple
            </ZookButton>
            <ZookButton
              type="button"
              tone="secondary"
              fullWidth
              onClick={() => void signInWithGoogle()}
              disabled={!hydrated || submitting !== null || ssoSubmitting !== null}
              state={ssoSubmitting === "google" ? "loading" : "idle"}
            >
              Google
            </ZookButton>
          </div>
        </div>
      ) : null}
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
