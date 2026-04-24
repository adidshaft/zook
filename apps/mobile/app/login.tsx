import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { Card, Screen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("member@zook.local");
  const [code, setCode] = useState("000000");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Development OTP is 000000.");

  async function handleContinue() {
    setBusy(true);
    try {
      if (stage === "email") {
        const result = await requestOtp(email);
        setStage("otp");
        setMessage(
          result.devOtp
            ? `OTP sent to ${email}. Development code is ${result.devOtp}.`
            : `OTP sent to ${email}.`
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
    <Screen title="Sign in">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title} selectable>
            Email OTP
          </Text>
          <Text style={styles.body} selectable>
            Email OTP is backed by the real Zook auth API. Mocks keep local development free and safe.
          </Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} />
          {stage === "otp" ? (
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" style={styles.input} />
          ) : null}
          <Pressable onPress={handleContinue} style={[styles.button, busy ? styles.buttonDisabled : undefined]} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? "Working..." : stage === "email" ? "Send OTP" : "Verify and continue"}</Text>
          </Pressable>
          <Text style={styles.body} selectable>
            {message}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  card: { gap: 14 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 20 },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.lime,
    padding: 16,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: { color: colors.bg, fontWeight: "900" }
});
