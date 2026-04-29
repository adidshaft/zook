import { useState } from "react";
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandMark, GlassCard, GlassInput, ZookButton, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { colors, spacing, typography } from "@/lib/theme";

const screenWidth = Dimensions.get("window").width;
const heroFontSize = Math.min(54, screenWidth * 0.13);

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function handleContinue() {
    setBusy(true);
    setDevOtp(null);
    try {
      if (stage === "email") {
        if (!email.includes("@")) {
          setMessage("Please enter a valid email address.");
          setBusy(false);
          return;
        }
        const result = await requestOtp(email);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStage("otp");
        setMessage(`Code sent to ${email}.`);
        if (__DEV__ && result.devOtp) {
          setDevOtp(result.devOtp);
        }
      } else {
        await verifyOtp(email, code);
        setMessage(`Signed in as ${email}.`);
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
          contentInsetAdjustmentBehavior="automatic"
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
                {stage === "email" ? "Enter Email" : "Verify Code"}
              </Text>
              <Text style={styles.formSubtitle}>
                {stage === "email" ? "We'll send a one-time code." : "Check your inbox."}
              </Text>
            </View>

            {stage === "email" ? (
              <GlassInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                editable={!busy}
              />
            ) : (
              <GlassInput
                label="One-Time Code"
                value={code}
                onChangeText={setCode}
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
              ) : stage === "email" ? "Send Code" : "Verify & Sign In"}
            </ZookButton>

            {stage === "otp" ? (
              <ZookButton
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setStage("email");
                  setDevOtp(null);
                }}
                disabled={busy}
                tone="secondary"
              >
                Use a different email
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

          {message && !devOtp ? (
            <Text style={styles.messageText}>{message}</Text>
          ) : null}
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
