import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BrandMark, GlassCard, GlassInput, ZookButton, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { getMobileReleaseProfile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors, spacing, typography } from "@/lib/theme";

const screenWidth = Dimensions.get("window").width;
const heroFontSize = Math.min(54, screenWidth * 0.13);

function sanitizeOtpCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function looksLikePhoneInput(value: string) {
  return !value.includes("@") && /^[+\d\s().-]*$/.test(value);
}

function formatIndiaPhoneInput(value: string) {
  if (!looksLikePhoneInput(value)) {
    return value;
  }
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

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const { t } = useI18n();
  const localDevOtp = __DEV__ && getMobileReleaseProfile() === "local" ? "000000" : null;
  const otpInputRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  async function requestCode(resend = false) {
    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.length < 3) {
      setMessage(t("auth.enterIdentifier"));
      return;
    }
    if (looksLikePhoneInput(trimmedIdentifier)) {
      const digits = trimmedIdentifier.replace(/\D/g, "");
      if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) {
        setMessage(t("auth.enterIndiaMobile"));
        return;
      }
    }
    setBusy(true);
    setDevOtp(null);
    try {
      const result = await requestOtp(trimmedIdentifier);
      const seededDevOtp = sanitizeOtpCode(result.devOtp ?? localDevOtp ?? "");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStage("otp");
      setCode(seededDevOtp);
      setMessage(
        t(resend ? "auth.freshCodeSent" : "auth.codeSent", { identifier: trimmedIdentifier }),
      );
      setDevOtp(seededDevOtp || null);
      setResendCooldown(30);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleContinue() {
    const trimmedIdentifier = identifier.trim();
    if (stage === "identifier") {
      await requestCode(false);
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(trimmedIdentifier, sanitizeOtpCode(code || devOtp || localDevOtp || ""));
      setMessage(t("auth.signedIn"));
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ZookScreen ambient={false}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroSection}>
            <View style={styles.heroGlow} />
            <Text style={styles.heroEyebrow}>{t("auth.heroEyebrow")}</Text>
            <View style={styles.logoRow}>
              <BrandMark size="lg" />
              <Text style={[styles.heroTitle, { fontSize: heroFontSize }]}>Zook</Text>
            </View>
            <Text style={styles.heroBody}>{t("auth.heroBody")}</Text>
          </View>

          <GlassCard contentStyle={styles.formContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {stage === "identifier" ? t("auth.signIn") : t("auth.verifyCode")}
              </Text>
              <Text style={styles.formSubtitle}>
                {stage === "identifier" ? t("auth.identifierSubtitle") : t("auth.otpSubtitle")}
              </Text>
            </View>

            {stage === "identifier" ? (
              <GlassInput
                label={t("auth.identifierLabel")}
                value={identifier}
                onChangeText={(value) => setIdentifier(formatIndiaPhoneInput(value))}
                autoCapitalize="none"
                autoComplete="username"
                keyboardType={
                  looksLikePhoneInput(identifier) && identifier ? "phone-pad" : "email-address"
                }
                placeholder={t("auth.identifierPlaceholder")}
                hint={looksLikePhoneInput(identifier) ? t("auth.phoneHint") : undefined}
                editable={!busy}
              />
            ) : (
              <OtpCodeInput
                ref={otpInputRef}
                code={code}
                onChange={(value) => setCode(sanitizeOtpCode(value))}
                disabled={busy}
                label={t("auth.otpLabel")}
                accessibilityLabel={t("auth.otpAccessibility")}
              />
            )}

            <ZookButton onPress={handleContinue} disabled={busy}>
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color={colors.bg} />
                  <Text style={styles.busyText}>{t("auth.working")}</Text>
                </View>
              ) : stage === "identifier" ? (
                t("auth.sendCode")
              ) : (
                t("auth.verifyAndSignIn")
              )}
            </ZookButton>

            {stage === "otp" ? (
              <View style={styles.otpActions}>
                <ZookButton
                  onPress={() => void requestCode(true)}
                  disabled={busy || resendCooldown > 0}
                  tone="secondary"
                  style={styles.otpAction}
                >
                  {resendCooldown > 0
                    ? t("auth.resendIn", { seconds: resendCooldown })
                    : t("auth.resendCode")}
                </ZookButton>
                <ZookButton
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setStage("identifier");
                    setCode("");
                    setDevOtp(null);
                    setResendCooldown(0);
                  }}
                  disabled={busy}
                  tone="secondary"
                  style={styles.otpAction}
                >
                  {t("auth.changeSignIn")}
                </ZookButton>
              </View>
            ) : null}
          </GlassCard>

          {/* Local test OTP banner — only visible in __DEV__ */}
          {devOtp ? (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerLabel}>{t("auth.testCode")}</Text>
              <Text style={styles.devBannerCode}>{devOtp}</Text>
            </View>
          ) : null}

          {message && !devOtp ? <Text style={styles.messageText}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ZookScreen>
  );
}

const OtpCodeInput = forwardRef<
  TextInput,
  {
    accessibilityLabel: string;
    code: string;
    disabled?: boolean;
    label: string;
    onChange: (value: string) => void;
  }
>(function OtpCodeInput({ accessibilityLabel, code, onChange, disabled = false, label }, ref) {
  return (
    <View style={styles.otpGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          if (!disabled && typeof ref !== "function") {
            ref?.current?.focus();
          }
        }}
        style={styles.otpCells}
      >
        {Array.from({ length: 6 }).map((_, index) => {
          const digit = code[index] ?? "";
          const active = index === Math.min(code.length, 5);
          return (
            <View key={index} style={[styles.otpCell, active ? styles.otpCellActive : null]}>
              <Text style={styles.otpCellText}>{digit}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={code}
        onChangeText={onChange}
        autoComplete="one-time-code"
        keyboardType="number-pad"
        maxLength={6}
        editable={!disabled}
        caretHidden
        textContentType="oneTimeCode"
        style={styles.hiddenOtpInput}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  inputLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  otpGroup: {
    gap: spacing.sm,
  },
  otpCells: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  otpCell: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  otpCellActive: {
    borderColor: colors.limeBorder,
    backgroundColor: colors.accentPanel,
  },
  otpCellText: {
    minHeight: 24,
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  hiddenOtpInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  otpAction: {
    flex: 1,
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
