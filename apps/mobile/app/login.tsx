import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BrandMark, GlassCard, GlassInput, ZookButton, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { getMobileReleaseProfile } from "@/lib/api";
import { colors, spacing, typography } from "@/lib/theme";

const screenWidth = Dimensions.get("window").width;
const heroFontSize = Math.min(54, screenWidth * 0.13);

function sanitizeOtpCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const localDevOtp = __DEV__ && getMobileReleaseProfile() === "local" ? "000000" : null;
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"identifier" | "otp">("identifier");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function handleContinue() {
    setBusy(true);
    setDevOtp(null);
    const trimmedIdentifier = identifier.trim();
    try {
      if (stage === "identifier") {
        if (trimmedIdentifier.length < 3) {
          setMessage("Enter your email or phone number.");
          setBusy(false);
          return;
        }
        const result = await requestOtp(trimmedIdentifier);
        const seededDevOtp = sanitizeOtpCode(result.devOtp ?? localDevOtp ?? "");
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStage("otp");
        setCode(seededDevOtp);
        setMessage(`Code sent to ${trimmedIdentifier}.`);
        setDevOtp(seededDevOtp || null);
      } else {
        await verifyOtp(trimmedIdentifier, sanitizeOtpCode(code || devOtp || localDevOtp || ""));
        setMessage("Signed in.");
      }
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
            <Text style={styles.heroEyebrow}>Fitness Operating System</Text>
            <View style={styles.logoRow}>
              <BrandMark size="lg" />
              <Text style={[styles.heroTitle, { fontSize: heroFontSize }]}>Zook</Text>
            </View>
            <Text style={styles.heroBody}>
              Your gym, your membership, your rhythm. Sign in to get started.
            </Text>
          </View>

          <GlassCard contentStyle={styles.formContent}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {stage === "identifier" ? "Sign in" : "Verify Code"}
              </Text>
              <Text style={styles.formSubtitle}>
                {stage === "identifier"
                  ? "Use your email or phone number."
                  : "Check your messages."}
              </Text>
            </View>

            {stage === "identifier" ? (
              <GlassInput
                label="Email or Phone"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoComplete="username"
                keyboardType="email-address"
                placeholder="you@example.com or 9876543210"
                editable={!busy}
              />
            ) : (
              <GlassInput
                label="One-Time Code"
                value={code}
                onChangeText={(value) => setCode(sanitizeOtpCode(value))}
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                editable={!busy}
              />
            )}

            <ZookButton onPress={handleContinue} disabled={busy}>
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color={colors.bg} />
                  <Text style={styles.busyText}>Working...</Text>
                </View>
              ) : stage === "identifier" ? (
                "Send Code"
              ) : (
                "Verify & Sign In"
              )}
            </ZookButton>

            {stage === "otp" ? (
              <ZookButton
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setStage("identifier");
                  setCode("");
                  setDevOtp(null);
                }}
                disabled={busy}
                tone="secondary"
              >
                Use a different sign-in
              </ZookButton>
            ) : null}
          </GlassCard>

          {/* Dev OTP banner — only visible in __DEV__ */}
          {devOtp ? (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerLabel}>DEV MODE</Text>
              <Text style={styles.devBannerCode}>{devOtp}</Text>
            </View>
          ) : null}

          {message && !devOtp ? <Text style={styles.messageText}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ZookScreen>
  );
}

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
