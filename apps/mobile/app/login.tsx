import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { Card, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function Login() {
  const [email, setEmail] = useState("member@zook.local");
  const [code, setCode] = useState("000000");
  const [message, setMessage] = useState("Development OTP is 000000.");

  async function mockLogin() {
    await SecureStore.setItemAsync("zook_session", `dev-${email}-${code}`);
    setMessage(`Signed in locally as ${email}. API login uses /api/auth/verify-otp.`);
  }

  return (
    <Screen title="Sign in">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title} selectable>
            Email OTP
          </Text>
          <Text style={styles.body} selectable>
            Mocks keep local development free. Real email/SMS providers can be enabled later server-side.
          </Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} />
          <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" style={styles.input} />
          <Pressable onPress={mockLogin} style={styles.button}>
            <Text style={styles.buttonText}>Store secure session</Text>
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
  buttonText: { color: colors.bg, fontWeight: "900" }
});
