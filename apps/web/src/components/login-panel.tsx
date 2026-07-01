"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ApiError, parseApiResponse } from "@zook/core";
import type { AuthSessionSummary } from "@zook/core";
import { toast } from "sonner";
import { ZookButton } from "./zook-button";
import { destinationToHref, resolvePostLoginDestination } from "@/lib/auth-destinations";
import type { WebHost } from "@/lib/host-routing";
import { loginRedirectMessage } from "@/lib/login-destination-labels";
import { getOrigins, webHostFromHeader, type WebOrigins } from "@/lib/origins";
import { sanitizeOtpValue } from "@/lib/otp";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } },
};

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
const googleOAuthStateKey = "zook.googleOAuthState";
const googleOAuthRedirectKey = "zook.googleOAuthRedirect";
type LoginSession = Parameters<typeof resolvePostLoginDestination>[0];
type LoginMethod = "phone" | "email";

function loadScript(src: string, errorMessage: string) {
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
    script.onerror = () => reject(new Error(errorMessage));
    if (!existing) {
      document.head.appendChild(script);
    }
  });
}

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function isValidPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return false;
  }
  if (trimmed.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(`+${digits}`);
  }
  return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
}

function randomOAuthValue() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rateLimitMessage(response: Response, locale: PublicLocale) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
  return { seconds, message: publicT(locale, "tooManyAttempts", { seconds }) };
}

function isInternalAuthError(error: unknown) {
  if (error instanceof ApiError && error.status >= 500) {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return /prisma|database server|localhost:5432|invocation|stack|sql|connection/i.test(message);
}

function loginErrorMessage(error: unknown, fallback: string) {
  if (isInternalAuthError(error)) {
    return fallback;
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function LoginPanel({
  locale = "en",
  currentHost,
  origins,
  initialIdentifier,
  initialCode = "",
  initialStage = "identifier",
}: {
  locale?: PublicLocale;
  currentHost?: WebHost;
  origins?: WebOrigins;
  initialIdentifier?: string;
  initialCode?: string;
  initialStage?: "identifier" | "otp";
}) {
  const searchParams = useSearchParams();
  const t = useCallback(
    (
      key: Parameters<typeof publicT>[1],
      replacements: Record<string, string | number> = {},
    ) => publicT(locale, key, replacements),
    [locale],
  );
  const seededIdentifier = initialIdentifier ?? searchParams.get("identifier") ?? searchParams.get("email") ?? "";
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    seededIdentifier.includes("@") ? "email" : "phone",
  );
  const [email, setEmail] = useState(seededIdentifier.includes("@") ? seededIdentifier : "");
  const [phone, setPhone] = useState(seededIdentifier && !seededIdentifier.includes("@") ? seededIdentifier : "");
  const [identifier, setIdentifier] = useState(
    seededIdentifier,
  );
  const [code, setCode] = useState(sanitizeOtpValue(initialCode));
  const [stage, setStage] = useState<"identifier" | "otp">(initialStage);
  const [submitting, setSubmitting] = useState<"request" | "verify" | null>(null);
  const [ssoSubmitting, setSsoSubmitting] = useState<"google" | "apple" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const redirectMessage = loginRedirectMessage(searchParams.get("redirect"), locale);
  const defaultMessage =
    redirectMessage
      ? redirectMessage
      : searchParams.get("redirect") === "/platform"
        ? t("signInPlatform")
        : t("signInDefault");
  const [message, setMessage] = useState(
    initialStage === "otp" && seededIdentifier
      ? t("otpSent", { identifier: seededIdentifier })
      : defaultMessage,
  );
  const showStatusMessage =
    stage !== "identifier" ||
    (message !== t("signInDefault") && message !== redirectMessage);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const redirectHrefForSession = useCallback((session: LoginSession, redirect: string | null) => {
    const resolvedOrigins = origins ?? getOrigins();
    const resolvedCurrentHost =
      currentHost ?? webHostFromHeader(window.location.host, resolvedOrigins);
    return destinationToHref(
      resolvePostLoginDestination(session, redirect),
      resolvedCurrentHost,
      resolvedOrigins,
    );
  }, [currentHost, origins]);

  const completeSsoSignIn = useCallback(
    async (
      provider: "google" | "apple",
      body: { idToken: string } | { identityToken: string },
      redirectOverride?: string | null,
    ) => {
      setSsoSubmitting(provider);
      try {
        const response = await fetch(`/api/auth/${provider}/callback`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
          body: JSON.stringify(body),
        });
        const payload = await parseApiResponse<{
          session?: AuthSessionSummary;
        }>(response);
        const redirect = redirectOverride ?? searchParams.get("redirect");
        const safeRedirect =
          redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
        toast.success(t("verifyContinue"));
        window.location.href = redirectHrefForSession(payload.session, safeRedirect);
    } catch (error) {
      const nextMessage = loginErrorMessage(error, t("signInCouldNotComplete"));
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSsoSubmitting(null);
      }
    },
    [redirectHrefForSession, searchParams, t],
  );

  useEffect(() => {
    if (!window.location.hash.includes("id_token=") && !window.location.hash.includes("error=")) {
      return;
    }
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const idToken = hashParams.get("id_token");
    const oauthError = hashParams.get("error");
    const returnedState = hashParams.get("state");
    const expectedState = window.sessionStorage.getItem(googleOAuthStateKey);
    const redirect = window.sessionStorage.getItem(googleOAuthRedirectKey);
    window.sessionStorage.removeItem(googleOAuthStateKey);
    window.sessionStorage.removeItem(googleOAuthRedirectKey);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (oauthError) {
      const nextMessage =
        oauthError === "access_denied"
          ? t("googleCancelled")
          : t("googleCouldNotComplete");
      setMessage(nextMessage);
      return;
    }
    if (!idToken) {
      return;
    }
    if (!expectedState || returnedState !== expectedState) {
      const nextMessage = t("googleCouldNotVerify");
      setMessage(nextMessage);
      toast.error(nextMessage);
      return;
    }
    void completeSsoSignIn("google", { idToken }, redirect);
  }, [completeSsoSignIn, t]);

  useEffect(() => {
    if (stage === "identifier") {
      const timer = window.setTimeout(() => {
        if (loginMethod === "email") {
          emailRef.current?.focus();
        } else {
          phoneRef.current?.focus();
        }
      }, 80);
      return () => window.clearTimeout(timer);
    }
    if (stage === "otp") {
      otpRef.current?.focus();
    }
    return undefined;
  }, [loginMethod, stage]);

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
    return loginMethod === "email" ? email.trim().toLowerCase() : phone.trim();
  }

  async function requestOtp({ resend = false }: { resend?: boolean } = {}) {
    if (resend && resendCooldown > 0) {
      return;
    }
    setSubmitting("request");
    try {
      const trimmedIdentifier = selectedIdentifier();
      if (loginMethod === "email" ? !isValidEmail(trimmedIdentifier) : !isValidPhone(trimmedIdentifier)) {
        setMessage(loginMethod === "email" ? t("invalidEmail") : t("invalidPhone"));
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
      void payload.devOtp;
      setMessage(t(resend ? "freshOtpSent" : "otpSent", { identifier: trimmedIdentifier }));
      setIdentifier(trimmedIdentifier);
      setCode("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setStage("otp");
      toast.success(t(resend ? "freshOtpSent" : "otpSent", { identifier: trimmedIdentifier }));
    } catch (error) {
      const nextMessage = loginErrorMessage(error, t("unableSendOtp"));
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
      const otpCode = sanitizeOtpValue(overrideCode ?? code);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-zook-intent": "mutate" },
        body: JSON.stringify({ identifier: trimmedIdentifier, code: otpCode }),
      });
      const payload = await parseApiResponse<{
        session?: AuthSessionSummary;
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
      window.location.href = redirectHrefForSession(payload.session, safeRedirect);
    } catch (error) {
      const nextMessage = loginErrorMessage(error, t("unableVerifyOtp"));
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSubmitting(null);
    }
  }

  async function signInWithGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!clientId) {
      setMessage(t("googleNotConfigured"));
      return;
    }
    setSsoSubmitting("google");
    try {
      const state = randomOAuthValue();
      const nonce = randomOAuthValue();
      const redirect = searchParams.get("redirect");
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
        window.sessionStorage.setItem(googleOAuthRedirectKey, redirect);
      } else {
        window.sessionStorage.removeItem(googleOAuthRedirectKey);
      }
      window.sessionStorage.setItem(googleOAuthStateKey, state);
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set(
        "redirect_uri",
        `${window.location.origin}${window.location.pathname}${window.location.search}`,
      );
      authUrl.searchParams.set("response_type", "id_token");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("prompt", "select_account");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("nonce", nonce);
      window.location.href = authUrl.toString();
    } catch (error) {
      const nextMessage = loginErrorMessage(error, t("googleFailed"));
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
      setMessage(t("appleNotConfigured"));
      return;
    }
    setSsoSubmitting("apple");
    try {
      await loadScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
        t("signInServiceLoadError"),
      );
      if (!window.AppleID?.auth) {
        throw new Error(t("appleUnavailable"));
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
        throw new Error(t("appleMissingToken"));
      }
      await completeSsoSignIn("apple", { identityToken });
    } catch (error) {
      const nextMessage = loginErrorMessage(error, t("appleFailed"));
      setMessage(nextMessage);
      toast.error(nextMessage);
      setSsoSubmitting(null);
    }
  }

  function handleOtpChange(value: string) {
    const nextCode = sanitizeOtpValue(value);
    setCode(nextCode);
    if (nextCode.length === 6 && submitting === null) {
      void verifyOtp(nextCode);
    }
  }

  return (
    <motion.div
      initial={false}
      className="w-full max-w-md rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-md)] sm:p-5"
    >
      {showStatusMessage ? (
        <motion.p
          variants={itemVariants}
          id="login-status"
          className="mb-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-sm leading-5 text-[var(--text-secondary)]"
          role="alert"
          aria-live="polite"
        >
          {message}
        </motion.p>
      ) : null}
      <motion.form
        initial={false}
        className="grid gap-3"
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
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-1">
              {(["phone", "email"] as const).map((method) => {
                const active = method === loginMethod;
                return (
                  <button
                    key={method}
                    type="button"
                    data-testid={`login-method-${method}`}
                    aria-pressed={active}
                    className={`zook-focus rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                    disabled={!hydrated || submitting !== null}
                    onClick={() => {
                      setLoginMethod(method);
                      setMessage(t("signInDefault"));
                    }}
                  >
                    {method === "phone" ? t("mobileNumber") : t("emailAddress")}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-2">
              {loginMethod === "email" ? (
                <input
                  id="login-email"
                  data-testid="login-email"
                  aria-label={t("emailAddress")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  ref={emailRef}
                  required
                  disabled={!hydrated || submitting !== null}
                  onChange={(event) => setEmail(event.target.value)}
                  className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              ) : (
                <input
                  id="login-phone"
                  data-testid="login-phone"
                  aria-label={t("mobileNumber")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  ref={phoneRef}
                  required
                  disabled={!hydrated || submitting !== null}
                  onChange={(event) => setPhone(event.target.value)}
                  className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              )}
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">
                {loginMethod === "email" ? t("emailHint") : t("mobileHint")}
              </p>
            </div>
          </>
        ) : null}
        {stage === "otp" ? (
          <>
            <label htmlFor="login-otp" className="text-xs font-medium uppercase text-[var(--text-secondary)]">
              {t("otp")}
            </label>
            <input
              id="login-otp"
              data-testid="login-otp"
              ref={otpRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-describedby="login-status login-otp-helper"
              aria-required="true"
              placeholder={t("otpPlaceholder")}
              value={code}
              onChange={(event) => handleOtpChange(event.target.value)}
              maxLength={6}
              required
              className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <p id="login-otp-helper" className="text-xs leading-5 text-[var(--text-secondary)]">
              {t("otpHint", { identifier })}
            </p>
          </>
        ) : null}
        {stage === "otp" && resendCooldown > 0 ? (
          <div className="grid gap-2" aria-live="polite">
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              {t("resendAvailable", { seconds: resendCooldown })}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--accent-fill)] transition-all"
                style={{
                  width: `${((OTP_RESEND_COOLDOWN_SECONDS - resendCooldown) / OTP_RESEND_COOLDOWN_SECONDS) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        <ZookButton
          type="submit"
          data-testid={stage === "identifier" ? "login-send-code" : "login-verify-code"}
          className="mt-2"
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
      </motion.form>
      {stage === "identifier" ? (
        <motion.div variants={itemVariants} className="mt-3 grid gap-3">
          <details className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
            <summary className="zook-focus flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)]">
              <span>{t("moreSignInOptions")}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="text-[var(--text-tertiary)] transition group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ZookButton
                type="button"
                data-testid="login-apple"
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
                data-testid="login-google"
                tone="secondary"
                fullWidth
                onClick={() => void signInWithGoogle()}
                disabled={!hydrated || submitting !== null || ssoSubmitting !== null}
                state={ssoSubmitting === "google" ? "loading" : "idle"}
              >
                Google
              </ZookButton>
            </div>
          </details>
        </motion.div>
      ) : null}
      {stage === "otp" ? (
        <motion.div variants={itemVariants} className="mt-3">
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
        </motion.div>
      ) : null}
    </motion.div>
  );
}
