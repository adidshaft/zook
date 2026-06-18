import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError } from "@zook/core/api";
import {
  Keyboard,
  LayoutAnimation,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "@/lib/reanimated-lite";
import {
  BrandMark,
  Card,
  Input,
  OtpInput,
  type OtpInputHandle,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { sanitizeOtpValue } from "@/lib/otp";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import { spacing, typography, useTheme } from "@/lib/theme";

type BusyAction = "otp" | null;
type LoginMethod = "phone" | "email";
type MessageTone = "neutral" | "danger" | "success";

const TERMS_URL = "https://zookfit.in/terms";
const PRIVACY_URL = "https://zookfit.in/privacy";
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_RATE_LIMIT_FALLBACK_SECONDS = 60;

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

function isValidPhoneIdentifier(value: string) {
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

function isValidEmailIdentifier(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const { t } = useI18n();
  const { palette } = useTheme();
  const showQaShortcuts = __DEV__ && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const params = useLocalSearchParams<{ prefill?: string; reason?: string }>();
  const otpInputRef = useRef<OtpInputHandle>(null);
  const verifyingRef = useRef(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("phone");
  const [emailValue, setEmailValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);
  const busy = busyAction !== null;

  function showMessage(nextMessage: string, tone: MessageTone = "neutral") {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  function clearMessage() {
    setMessage("");
    setMessageTone("neutral");
  }

  useEffect(() => {
    const prefill = Array.isArray(params.prefill) ? params.prefill[0] : params.prefill;
    if (!prefill) {
      return;
    }
    const nextMethod = prefill.includes("@") ? "email" : "phone";
    setLoginMethod(nextMethod);
    if (nextMethod === "email") {
      setEmailValue(prefill.trim().toLowerCase());
    } else {
      setPhoneValue(prefill.trim());
    }
    setIdentifierTouched(false);
  }, [params.prefill]);

  useEffect(() => {
    const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
    if (reason === "proactive") {
      showMessage(t("auth.verifyToContinue"));
    }
    if (reason === "expired") {
      showMessage(t("auth.sessionExpired"));
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
    showMessage(tooManyAttemptsMessage(rateLimitCooldown), "danger");
    const timer = setInterval(() => {
      setRateLimitCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  function resetOtpState() {
    setCode("");
    setResendCooldown(0);
    setRateLimitCooldown(0);
    setAccountLocked(false);
  }

  function selectedIdentifier() {
    const trimmed = (loginMethod === "email" ? emailValue : phoneValue).trim();
    return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
  }

  const identifierValue = loginMethod === "email" ? emailValue : phoneValue;
  const identifierLabel =
    loginMethod === "email" ? t("auth.emailLabel") : t("auth.mobileLabel");
  const identifierPlaceholder =
    loginMethod === "email" ? t("auth.emailPlaceholderLogin") : t("auth.mobilePlaceholder");
  const identifierInvalidMessage =
    loginMethod === "email" ? t("auth.invalidEmailOnly") : t("auth.invalidMobile");
  const identifierInvalid =
    identifierTouched &&
    identifierValue.trim().length > 0 &&
    !(loginMethod === "email"
      ? isValidEmailIdentifier(identifierValue)
      : isValidPhoneIdentifier(identifierValue));

  function handleOtpError(error: unknown) {
    if (isAccountLockedError(error)) {
      setAccountLocked(true);
      showMessage(getApiErrorMessage(error), "danger");
      return;
    }
    if (error instanceof ApiError && error.status === 429) {
      const seconds = readRetryAfterSeconds(error);
      setRateLimitCooldown(seconds);
      showMessage(tooManyAttemptsMessage(seconds), "danger");
      return;
    }
    showMessage(getApiErrorMessage(error), "danger");
  }

  async function requestCode(resend = false) {
    if ((resend && accountLocked) || rateLimitCooldown > 0) {
      return;
    }
    const identifier = selectedIdentifier();
    if (
      loginMethod === "email"
        ? !isValidEmailIdentifier(identifier)
        : !isValidPhoneIdentifier(identifier)
    ) {
      showMessage(identifierInvalidMessage, "danger");
      return;
    }
    setBusyAction("otp");
    setAccountLocked(false);
    try {
      await requestOtp(identifier);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStage("otp");
      setCode("");
      showMessage(t(resend ? "auth.freshCodeSent" : "auth.codeSent", { identifier }), "success");
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
    const nextCode = sanitizeOtpValue(overrideCode ?? code);
    if (verifyingRef.current || accountLocked || rateLimitCooldown > 0 || nextCode.length !== 6) {
      return;
    }
    verifyingRef.current = true;
    setBusyAction("otp");
    try {
      await verifyOtp(identifier, nextCode);
      showMessage(t("auth.signedIn"), "success");
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
    const nextCode = sanitizeOtpValue(value);
    setCode(nextCode);
    if (nextCode.length === 6) {
      Keyboard.dismiss();
      void submitOtp(nextCode);
    }
  }

  return (
    <ZookScreen testID="login-screen">
      <KeyboardAwareScreen
        scrollViewProps={{
          contentInsetAdjustmentBehavior: "never",
          contentContainerStyle: styles.content,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
          <Text style={[styles.heroEyebrow, { color: palette.accent.base }]}>{t("auth.heroEyebrow")}</Text>
          <View style={styles.logoRow}>
            <BrandMark size="lg" />
            <Text style={[styles.heroTitle, { color: palette.text.primary }]}>Zook</Text>
          </View>
          <Text style={[styles.heroBody, { color: palette.text.secondary }]}>{t("auth.heroBody")}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <Card style={styles.formCard} contentStyle={styles.formContent}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>
                {stage === "identifier" ? t("auth.signIn") : t("auth.verifyCode")}
              </Text>
              <Text style={[styles.formSubtitle, { color: palette.text.secondary }]}>
                {stage === "identifier"
                  ? t("auth.identifierSubtitle")
                  : t("auth.otpSubtitle")}
              </Text>
            </View>

            {stage === "identifier" ? (
              <>
                <Input
                  testID={loginMethod === "email" ? "login-email" : "login-phone"}
                  label={identifierLabel}
                  value={identifierValue}
                  onChangeText={(value) => {
                    if (loginMethod === "email") {
                      setEmailValue(value);
                    } else {
                      setPhoneValue(value);
                    }
                    if (
                      message === t("auth.invalidEmail") ||
                      message === t("auth.invalidEmailOnly") ||
                      message === t("auth.invalidMobile")
                    ) {
                      clearMessage();
                    }
                  }}
                  onBlur={() => setIdentifierTouched(true)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={loginMethod === "email" ? "email-address" : "phone-pad"}
                  textContentType={loginMethod === "email" ? "emailAddress" : "telephoneNumber"}
                  returnKeyType="next"
                  placeholder={identifierPlaceholder}
                  editable={!busy}
                />
                <View style={styles.methodTabs}>
                  {(["phone", "email"] as const).map((method) => {
                    const active = method === loginMethod;
                    return (
                      <Pressable
                        key={method}
                        testID={`login-method-${method}`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          method === "phone" ? t("auth.useMobile") : t("auth.useEmail")
                        }
                        accessibilityState={{ selected: active }}
                        disabled={busy}
                        onPress={() => {
                          setLoginMethod(method);
                          setIdentifierTouched(false);
                          if (
                            message === t("auth.invalidEmail") ||
                            message === t("auth.invalidEmailOnly") ||
                            message === t("auth.invalidMobile")
                          ) {
                            clearMessage();
                          }
                        }}
                        style={[
                          styles.methodTab,
                          {
                            backgroundColor: active ? palette.surface.accentSoft : palette.surface.raised,
                            borderColor: active ? palette.accent.base : palette.border.default,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.methodTabText,
                            { color: active ? palette.accent.base : palette.text.secondary },
                          ]}
                        >
                          {method === "phone" ? t("auth.mobileLabel") : t("auth.emailLabel")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {identifierInvalid ? (
                  <Text style={[styles.inlineError, { color: palette.feedback.danger }]}>{identifierInvalidMessage}</Text>
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
              {stage === "identifier" ? t("auth.sendCode") : t("auth.verifyAndSignIn")}
            </ZookButton>

            {stage === "otp" ? (
              <View style={styles.otpActions}>
                <ZookButton
                  testID="login-resend-code"
                  onPress={() => void requestCode(true)}
                  disabled={busy || accountLocked || resendCooldown > 0 || rateLimitCooldown > 0}
                  variant="secondary"
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
                    clearMessage();
                  }}
                  disabled={busy}
                  variant="secondary"
                  style={styles.otpAction}
                >
                  {t("auth.changeSignIn")}
                </ZookButton>
              </View>
            ) : (
              <>
                <Text style={[styles.legalText, { color: palette.text.tertiary }]}>
                  By continuing you agree to our{" "}
                  <Text
                    accessibilityRole="link"
                    accessibilityLabel="Open Zook terms"
                    style={[styles.legalLink, { color: palette.accent.base }]}
                    onPress={() => void Linking.openURL(TERMS_URL)}
                  >
                    Terms
                  </Text>{" "}
                  and{" "}
                  <Text
                    accessibilityRole="link"
                    accessibilityLabel="Open Zook privacy policy"
                    style={[styles.legalLink, { color: palette.accent.base }]}
                    onPress={() => void Linking.openURL(PRIVACY_URL)}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
                {showQaShortcuts ? (
                  <ZookButton
                    testID="login-qa-shortcuts"
                    variant="ghost"
                    onPress={() => router.push("/qa" as never)}
                  >
                    QA shortcuts
                  </ZookButton>
                ) : null}
              </>
            )}
          </Card>
        </Animated.View>

        {message ? (
          <Text
            testID="login-message"
            style={[
              styles.messageText,
              {
                color:
                  messageTone === "danger"
                    ? palette.feedback.danger
                    : messageTone === "success"
                      ? palette.feedback.success
                      : palette.text.secondary,
              },
            ]}
          >
            {message}
          </Text>
        ) : null}
      </KeyboardAwareScreen>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: "center",
    padding: 16,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 16,
  },
  heroSection: {
    gap: 8,
    position: "relative",
    paddingVertical: 12,
  },
  heroEyebrow: {
    ...typography.eyebrow,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -4,
  },
  heroTitle: {
    ...typography.screenTitle,
  },
  heroBody: {
    ...typography.body,
    marginTop: 8,
  },
  formCard: {
    borderRadius: 24,
  },
  formContent: {
    gap: spacing.lg,
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    ...typography.headerTitle,
  },
  formSubtitle: {
    ...typography.body,
  },
  inlineError: {
    marginTop: -spacing.sm,
    ...typography.caption,
  },
  methodTabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  methodTab: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
  },
  methodTabText: {
    ...typography.button,
  },
  otpActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  otpAction: {
    flex: 1,
    minWidth: 132,
  },
  legalText: {
    ...typography.caption,
    textAlign: "center",
  },
  legalLink: {
    fontFamily: "Inter_700Bold",
  },
  messageText: {
    ...typography.body,
    textAlign: "center",
  },
});
