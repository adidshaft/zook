import { useEffect, useRef, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
import { ApiError } from "@zook/core/api";
import {
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown } from "@/lib/reanimated-lite";
import {
  BrandMark,
  GlassCard,
  GlassInput,
  OtpInput,
  type OtpInputHandle,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { getMobileReleaseProfile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors, spacing, typography } from "@/lib/theme";

type BusyAction = "otp" | "apple" | "google" | null;

const TERMS_URL = "https://zookfit.in/terms";
const PRIVACY_URL = "https://zookfit.in/privacy";
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_RATE_LIMIT_FALLBACK_SECONDS = 60;

let googleSignInConfigured = false;
let googleSignInModule:
  | typeof import("@react-native-google-signin/google-signin")
  | null
  | undefined;

async function getGoogleSigninModule() {
  if (googleSignInModule !== undefined) {
    return googleSignInModule;
  }
  try {
    googleSignInModule = await import("@react-native-google-signin/google-signin");
  } catch {
    googleSignInModule = null;
  }
  return googleSignInModule;
}

function sanitizeOtpCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function isCanceledAuthError(error: unknown) {
  return (
    error instanceof Error &&
    ("code" in error ? String(error.code) === "ERR_REQUEST_CANCELED" : false)
  );
}

function readRetryAfterSeconds(error: ApiError) {
  const details = error.details;
  if (typeof details !== "object" || details === null) {
    return OTP_RATE_LIMIT_FALLBACK_SECONDS;
  }
  const retryAfter =
    "retryAfterSeconds" in details
      ? (details as { retryAfterSeconds?: unknown }).retryAfterSeconds
      : "retryAfter" in details
        ? (details as { retryAfter?: unknown }).retryAfter
        : undefined;
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : OTP_RATE_LIMIT_FALLBACK_SECONDS;
}

function tooManyAttemptsMessage(seconds: number) {
  return `Too many attempts. Try again in ${seconds}s.`;
}

function isAccountLockedError(error: unknown) {
  return error instanceof ApiError && (error.status === 423 || error.code === "account_locked");
}

async function configureGoogleSignIn() {
  if (googleSignInConfigured) return;
  const module = await getGoogleSigninModule();
  if (!module) {
    throw new Error("Google sign-in is not available in Expo Go.");
  }
  module.GoogleSignin.configure({
    scopes: ["email", "profile"],
    webClientId:
      (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:
      (Constants.expoConfig?.extra?.googleIosClientId as string | undefined) ??
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  googleSignInConfigured = true;
}

export default function Login() {
  const { requestOtp, signInWithApple, signInWithGoogle, verifyOtp } = useAuth();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ prefill?: string; reason?: string }>();
  const { width } = useWindowDimensions();
  const heroFontSize = Math.min(54, width * 0.13);
  const localDevOtp = __DEV__ && getMobileReleaseProfile() === "local" ? "000000" : null;
  const otpInputRef = useRef<OtpInputHandle>(null);
  const verifyingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);
  const busy = busyAction !== null;

  useEffect(() => {
    const prefill = Array.isArray(params.prefill) ? params.prefill[0] : params.prefill;
    if (!prefill) {
      return;
    }
    if (prefill.includes("@")) {
      setEmail(prefill.trim().toLowerCase());
      setEmailTouched(false);
    }
  }, [params.prefill]);

  useEffect(() => {
    const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
    if (reason === "proactive") {
      setMessage(t("auth.verifyToContinue"));
    }
    if (reason === "expired") {
      setMessage(t("auth.sessionExpired"));
    }
  }, [params.reason, t]);

  useEffect(() => {
    if (stage === "otp") {
      const timer = setTimeout(() => otpInputRef.current?.focus(), 220);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [stage]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return undefined;
    setMessage(tooManyAttemptsMessage(rateLimitCooldown));
    const timer = setInterval(() => {
      setRateLimitCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  function resetOtpState() {
    setCode("");
    setDevOtp(null);
    setResendCooldown(0);
    setRateLimitCooldown(0);
    setAccountLocked(false);
  }

  function selectedIdentifier() {
    return email.trim().toLowerCase();
  }

  const emailInvalid =
    emailTouched && email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim());

  function handleOtpError(error: unknown) {
    if (isAccountLockedError(error)) {
      setAccountLocked(true);
      setMessage(getApiErrorMessage(error));
      return;
    }
    if (error instanceof ApiError && error.status === 429) {
      const seconds = readRetryAfterSeconds(error);
      setRateLimitCooldown(seconds);
      setMessage(tooManyAttemptsMessage(seconds));
      return;
    }
    setMessage(getApiErrorMessage(error));
  }

  async function requestCode(resend = false) {
    if ((resend && accountLocked) || rateLimitCooldown > 0) {
      return;
    }
    const identifier = selectedIdentifier();
    if (!/^\S+@\S+\.\S+$/.test(identifier)) {
      setMessage(t("auth.invalidEmail"));
      return;
    }
    setBusyAction("otp");
    setDevOtp(null);
    setAccountLocked(false);
    try {
      const result = await requestOtp(identifier);
      const seededDevOtp = sanitizeOtpCode(result.devOtp ?? localDevOtp ?? "");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStage("otp");
      setCode("");
      setMessage(t(resend ? "auth.freshCodeSent" : "auth.codeSent", { identifier }));
      setDevOtp(seededDevOtp || null);
      setRateLimitCooldown(0);
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      handleOtpError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function submitOtp(overrideCode?: string) {
    const identifier = selectedIdentifier();
    const nextCode = sanitizeOtpCode(overrideCode ?? code);
    if (verifyingRef.current || accountLocked || rateLimitCooldown > 0 || nextCode.length !== 6) {
      return;
    }
    verifyingRef.current = true;
    setBusyAction("otp");
    try {
      await verifyOtp(identifier, nextCode);
      setMessage(t("auth.signedIn"));
    } catch (error) {
      handleOtpError(error);
    } finally {
      verifyingRef.current = false;
      setBusyAction(null);
    }
  }

  async function handleContinue() {
    if (stage === "identifier") {
      await requestCode(false);
      return;
    }
    await submitOtp();
  }

  function handleOtpChange(value: string) {
    const nextCode = sanitizeOtpCode(value);
    setCode(nextCode);
    if (nextCode.length === 6) {
      Keyboard.dismiss();
      void submitOtp(nextCode);
    }
  }

  async function handleAppleSignIn() {
    setBusyAction("apple");
    setMessage("");
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        setMessage(t("auth.appleUnavailable"));
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setMessage(t("auth.appleNoToken"));
        return;
      }
      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.middleName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ");
      await signInWithApple(credential.identityToken, fullName || undefined);
      setMessage(t("auth.signedIn"));
    } catch (error) {
      if (isCanceledAuthError(error)) return;
      setMessage(
        error instanceof ApiError && error.status === 501
          ? t("auth.appleComingSoon")
          : getApiErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGoogleSignIn() {
    setBusyAction("google");
    setMessage("");
    try {
      await configureGoogleSignIn();
      const module = await getGoogleSigninModule();
      if (!module) {
        setMessage(t("auth.googleUnavailable"));
        return;
      }
      if (Platform.OS === "android") {
        await module.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const response = await module.GoogleSignin.signIn();
      if (response.type !== "success") return;
      const idToken = response.data.idToken ?? (await module.GoogleSignin.getTokens()).idToken;
      if (!idToken) {
        setMessage(t("auth.googleNoToken"));
        return;
      }
      await signInWithGoogle(idToken);
      setMessage(t("auth.signedIn"));
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status === 501
          ? t("auth.googleComingSoon")
          : getApiErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <ZookScreen ambient={false} testID="login-screen">
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          contentContainerStyle: styles.content,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>{t("auth.heroEyebrow")}</Text>
          <View style={styles.logoRow}>
            <BrandMark size="lg" />
            <Text style={[styles.heroTitle, { fontSize: heroFontSize }]}>Zook</Text>
          </View>
          <Text style={styles.heroBody}>{t("auth.heroBody")}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <GlassCard contentStyle={styles.formContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {stage === "identifier" ? t("auth.signIn") : t("auth.verifyCode")}
              </Text>
              <Text style={styles.formSubtitle}>
                {stage === "identifier"
                  ? "Enter your registered email address."
                  : t("auth.otpSubtitle")}
              </Text>
            </View>

            {stage === "identifier" ? (
              <>
                <GlassInput
                  testID="login-email"
                  label="Email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (message === t("auth.invalidEmail")) setMessage("");
                  }}
                  onBlur={() => setEmailTouched(true)}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  placeholder="email@example.com"
                  editable={!busy}
                />
                {emailInvalid ? (
                  <Text style={styles.inlineError}>{t("auth.invalidEmail")}</Text>
                ) : null}
              </>
            ) : (
              <OtpInput
                ref={otpInputRef}
                value={code}
                onChange={handleOtpChange}
                onComplete={(nextCode) => {
                  Keyboard.dismiss();
                  void submitOtp(nextCode);
                }}
                disabled={busy || accountLocked || rateLimitCooldown > 0}
                label={t("auth.otpLabel")}
                accessibilityLabel={t("auth.otpAccessibility")}
                testID="login-otp"
              />
            )}

            <ZookButton
              testID={stage === "identifier" ? "login-send-code" : "login-verify-code"}
              onPress={handleContinue}
              size="lg"
              fullWidth
              disabled={busy || accountLocked || rateLimitCooldown > 0}
              busy={busyAction === "otp"}
              busyLabel={t("auth.working")}
            >
              {stage === "identifier" ? "Send email code" : t("auth.verifyAndSignIn")}
            </ZookButton>

            {stage === "otp" ? (
              <View style={styles.otpActions}>
                <ZookButton
                  testID="login-resend-code"
                  onPress={() => void requestCode(true)}
                  disabled={busy || accountLocked || resendCooldown > 0 || rateLimitCooldown > 0}
                  tone="secondary"
                  style={styles.otpAction}
                >
                  {resendCooldown > 0
                    ? t("auth.resendIn", { seconds: resendCooldown })
                    : t("auth.resendCode")}
                </ZookButton>
                <ZookButton
                  testID="login-change-sign-in"
                  onPress={() => {
                    Keyboard.dismiss();
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setStage("identifier");
                    resetOtpState();
                  }}
                  disabled={busy}
                  tone="secondary"
                  style={styles.otpAction}
                >
                  {t("auth.changeSignIn")}
                </ZookButton>
              </View>
            ) : (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.ssoRow}>
                  <SsoButton
                    testID="login-apple"
                    label="Apple"
                    mark="A"
                    busy={busyAction === "apple"}
                    disabled={busy}
                    onPress={() => void handleAppleSignIn()}
                  />
                  <SsoButton
                    testID="login-google"
                    label="Google"
                    mark="G"
                    busy={busyAction === "google"}
                    disabled={busy}
                    onPress={() => void handleGoogleSignIn()}
                  />
                </View>
                <Text style={styles.legalText}>
                  By continuing you agree to our{" "}
                  <Text style={styles.legalLink} onPress={() => void Linking.openURL(TERMS_URL)}>
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text style={styles.legalLink} onPress={() => void Linking.openURL(PRIVACY_URL)}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* Local test OTP banner - only visible in __DEV__ */}
        {devOtp ? (
          <View testID="login-dev-otp-banner" style={styles.devBanner}>
            <Text style={styles.devBannerLabel}>{t("auth.testCode")}</Text>
            <Text style={styles.devBannerCode}>{devOtp}</Text>
          </View>
        ) : null}

        {message ? <Text testID="login-message" style={styles.messageText}>{message}</Text> : null}
      </KeyboardAwareScreen>
    </ZookScreen>
  );
}

function SsoButton({
  busy,
  disabled,
  label,
  mark,
  onPress,
  testID,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  mark: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ssoButton,
        pressed && !disabled ? styles.ssoButtonPressed : null,
        disabled ? styles.ssoButtonDisabled : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Text style={styles.ssoMark}>{mark}</Text>
      )}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={styles.ssoLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 18,
  },
  heroSection: {
    gap: 8,
    position: "relative",
    paddingVertical: 24,
  },
  heroGlow: {
    position: "absolute",
    top: -20,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(185,244,85,0.08)",
  },
  heroEyebrow: {
    color: colors.lime,
    ...typography.eyebrow,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -4,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: "Inter_900Black",
    lineHeight: 60,
  },
  heroBody: {
    color: colors.muted,
    ...typography.body,
    marginTop: 8,
  },
  formContent: {
    gap: spacing.lg,
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  formSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  inlineError: {
    marginTop: -spacing.sm,
    color: colors.red,
    ...typography.caption,
  },
  otpActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  otpAction: {
    flex: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.subtle,
    ...typography.caption,
  },
  ssoRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  ssoButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ssoButtonPressed: {
    backgroundColor: colors.accentPanel,
  },
  ssoButtonDisabled: {
    opacity: 0.6,
  },
  ssoMark: {
    width: 18,
    color: colors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
  },
  ssoLabel: {
    color: colors.text,
    ...typography.button,
  },
  legalText: {
    color: colors.subtle,
    ...typography.caption,
    textAlign: "center",
  },
  legalLink: {
    color: colors.lime,
    fontFamily: "Inter_700Bold",
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  busyText: {
    color: colors.bg,
    ...typography.button,
  },
  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.4)",
    backgroundColor: "rgba(242,201,76,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devBannerLabel: {
    color: colors.amber,
    ...typography.eyebrow,
  },
  devBannerCode: {
    color: colors.text,
    ...typography.metric,
  },
  messageText: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
});
