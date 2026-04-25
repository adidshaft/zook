import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, GlassInput, PrimaryButton, Screen, ScreenHeader, SecondaryButton } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleContinue() {
    setBusy(true);
    try {
      if (stage === "email") {
        const result = await requestOtp(email);
        setStage("otp");
        setMessage(
          result.devOtp
            ? `Code sent to ${email}. Dev code: ${result.devOtp}.`
            : `Code sent to ${email}.`
        );
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
    <Screen>
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
            <Text style={styles.heroEyebrow}>Welcome to</Text>
            <Text style={styles.heroTitle}>Zook</Text>
            <Text style={styles.heroBody}>
              Your gym, your membership, your rhythm. Sign in to get started.
            </Text>
          </View>

          <Card style={styles.card}>
            <ScreenHeader
              title={stage === "email" ? "Enter Email" : "Verify Code"}
              subtitle={stage === "email" ? "We'll send a one-time code." : "Check your inbox."}
            />

            <View style={styles.form}>
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

              <PrimaryButton onPress={handleContinue} disabled={busy}>
                {busy ? "Working..." : stage === "email" ? "Send Code" : "Verify & Sign In"}
              </PrimaryButton>

              {stage === "otp" ? (
                <SecondaryButton onPress={() => setStage("email")} disabled={busy}>
                  Use a different email
                </SecondaryButton>
              ) : null}
            </View>
          </Card>

          {message ? (
            <Text style={styles.messageText}>{message}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 54,
    fontWeight: "900",
    lineHeight: 60,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  card: {
    gap: 24,
    padding: 24,
  },
  form: {
    gap: 16,
  },
  messageText: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
  },
});
