"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ApiError, parseApiResponse } from "@zook/core";
import type { AuthSessionSummary } from "@zook/core";
import { toast } from "sonner";
import { MoreSignInOptions, OtpActionButtons } from "./login-panel-actions";
import {
  isValidEmail,
  isValidPhone,
  loginErrorMessage,
  OTP_RESEND_COOLDOWN_SECONDS,
  rateLimitMessage,
} from "./login-panel-auth-helpers";
import { LoginIdentifierFields, LoginOtpFields, LoginResendCooldown } from "./login-panel-form";
import { useLoginPanelLifecycle } from "./login-panel-lifecycle";
import { LoginStatusMessage, LoginSubmitButton } from "./login-panel-shell";
import {
  googleOAuthRedirectKey,
  googleOAuthStateKey,
  loadScript,
  randomOAuthValue,
} from "./login-panel-sso";
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

type LoginSession = Parameters<typeof resolvePostLoginDestination>[0];
type LoginMethod = "phone" | "email";

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

  useLoginPanelLifecycle({
    emailRef,
    loginMethod,
    otpRef,
    phoneRef,
    resendCooldown,
    setHydrated,
    setResendCooldown,
    stage,
  });

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
      <LoginStatusMessage itemVariants={itemVariants} message={message} show={showStatusMessage} />
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
          <LoginIdentifierFields
            disabled={!hydrated || submitting !== null}
            email={email}
            emailRef={emailRef}
            labels={{
              emailAddress: t("emailAddress"),
              emailHint: t("emailHint"),
              mobileHint: t("mobileHint"),
              mobileNumber: t("mobileNumber"),
              signInDefault: t("signInDefault"),
            }}
            loginMethod={loginMethod}
            phone={phone}
            phoneRef={phoneRef}
            setEmail={setEmail}
            setLoginMethod={setLoginMethod}
            setMessage={setMessage}
            setPhone={setPhone}
          />
        ) : null}
        {stage === "otp" ? (
          <LoginOtpFields
            code={code}
            handleOtpChange={handleOtpChange}
            identifier={identifier}
            labels={{
              otp: t("otp"),
              otpHint: t("otpHint", { identifier }),
              otpPlaceholder: t("otpPlaceholder"),
            }}
            otpRef={otpRef}
          />
        ) : null}
        {stage === "otp" ? (
          <LoginResendCooldown
            cooldownSeconds={resendCooldown}
            label={t("resendAvailable", { seconds: resendCooldown })}
            totalSeconds={OTP_RESEND_COOLDOWN_SECONDS}
          />
        ) : null}
        <LoginSubmitButton
          code={code}
          hydrated={hydrated}
          labels={{
            sendOtp: t("sendOtp"),
            sendingOtp: t("sendingOtp"),
            verifying: t("verifying"),
            verifyContinue: t("verifyContinue"),
          }}
          ssoSubmitting={ssoSubmitting}
          stage={stage}
          submitting={submitting}
        />
      </motion.form>
      {stage === "identifier" ? (
        <MoreSignInOptions
          itemVariants={itemVariants}
          hydrated={hydrated}
          submitting={submitting !== null}
          ssoSubmitting={ssoSubmitting}
          labels={{ moreSignInOptions: t("moreSignInOptions") }}
          onApple={() => void signInWithApple()}
          onGoogle={() => void signInWithGoogle()}
        />
      ) : null}
      {stage === "otp" ? (
        <OtpActionButtons
          itemVariants={itemVariants}
          submitting={submitting !== null}
          resendCooldown={resendCooldown}
          labels={{
            resendUnavailable: t("resendUnavailable"),
            resendOtp: t("resendOtp"),
            changeSignIn: t("changeSignIn"),
          }}
          onResend={() => void requestOtp({ resend: true })}
          onChangeSignIn={() => {
            setStage("identifier");
            setCode("");
            setResendCooldown(0);
          }}
        />
      ) : null}
    </motion.div>
  );
}
