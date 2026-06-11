import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  GlassCard,
  GlassInput,
  ListRow,
  MobileHeader,
  OtpInput,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export default function AccountSettingsScreen() {
  const { activeOrgId, biometricEnabled, refresh, session, setBiometricEnabled, token } = useAuth();
  const { palette } = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-account-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Account" subtitle="Your member identity" showProfileShortcut={false} />
          <GlassCard variant="compact" contentStyle={styles.list}>
            <ListRow title="Name" subtitle={session?.user.name ?? "Not set"} icon="person-outline" />
            <ListRow title="Email" subtitle={session?.user.email ?? "Not set"} icon="mail-outline" />
            <ListRow title="Phone" subtitle={session?.user.phone ?? "Not set"} icon="call-outline" />
          </GlassCard>
          <GlassCard variant="compact" contentStyle={styles.form}>
            <Text style={[styles.title, { color: palette.text.primary }]}>Contact verification</Text>
            <Text style={[styles.helper, { color: palette.text.secondary }]}>
              Add or update your email and mobile number with OTP verification.
            </Text>
            <ContactVerifier
              activeOrgId={activeOrgId}
              currentValue={session?.user.email}
              kind="email"
              onVerified={refresh}
              token={token}
            />
            <ContactVerifier
              activeOrgId={activeOrgId}
              currentValue={session?.user.phone}
              kind="phone"
              onVerified={refresh}
              token={token}
            />
          </GlassCard>
          <GlassCard variant="compact" contentStyle={styles.toggleRow}>
            <Text style={[styles.title, { color: palette.text.primary }]}>Biometric unlock</Text>
            <ThemedSwitch
              value={biometricEnabled}
              onValueChange={(value) => void setBiometricEnabled(value)}
            />
          </GlassCard>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function ContactVerifier({
  activeOrgId,
  currentValue,
  kind,
  onVerified,
  token,
}: {
  activeOrgId?: string;
  currentValue?: string | null;
  kind: "email" | "phone";
  onVerified: () => Promise<string | void>;
  token?: string;
}) {
  const { palette } = useTheme();
  const [value, setValue] = useState(currentValue ?? "");
  const [code, setCode] = useState("");
  const [requestedFor, setRequestedFor] = useState<string | undefined>();
  const [busy, setBusy] = useState<"request" | "verify" | undefined>();
  const [error, setError] = useState<string | undefined>();
  const trimmedValue = value.trim();
  const title = kind === "email" ? "Email" : "Mobile number";
  const placeholder = kind === "email" ? "you@example.com" : "+91 98765 43210";
  const keyboardType = kind === "email" ? "email-address" : "phone-pad";
  const inputMode = kind === "email" ? "email" : "tel";
  const helper = useMemo(() => {
    if (!currentValue) {
      return `No ${kind === "email" ? "email" : "mobile number"} linked yet.`;
    }
    return `Current: ${currentValue}`;
  }, [currentValue, kind]);

  async function requestOtp() {
    if (!token) {
      setError("Sign in again to update your contact details.");
      return;
    }
    if (!trimmedValue) {
      setError(`Enter your ${kind === "email" ? "email" : "mobile number"}.`);
      return;
    }
    setBusy("request");
    setError(undefined);
    try {
      await memberApi.requestContactOtp({
        token,
        orgId: activeOrgId,
        identifier: trimmedValue,
      });
      setRequestedFor(trimmedValue);
      setCode("");
      Alert.alert("OTP sent", `Enter the code sent to ${trimmedValue}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send OTP.");
    } finally {
      setBusy(undefined);
    }
  }

  async function verifyOtp(nextCode = code) {
    if (!token || !requestedFor) {
      return;
    }
    if (nextCode.length !== 6) {
      setError("Enter the 6 digit OTP.");
      return;
    }
    setBusy("verify");
    setError(undefined);
    try {
      await memberApi.verifyContactOtp({
        token,
        orgId: activeOrgId,
        identifier: requestedFor,
        code: nextCode,
      });
      await onVerified();
      setRequestedFor(undefined);
      setCode("");
      Alert.alert(`${title} verified`, "Your account has been updated.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify OTP.");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <View style={styles.contactBlock}>
      <GlassInput
        autoCapitalize="none"
        autoCorrect={false}
        hint={helper}
        inputMode={inputMode}
        keyboardType={keyboardType}
        label={title}
        onChangeText={(nextValue) => {
          setValue(nextValue);
          if (requestedFor && nextValue.trim() !== requestedFor) {
            setRequestedFor(undefined);
            setCode("");
          }
        }}
        placeholder={placeholder}
        textContentType={kind === "email" ? "emailAddress" : "telephoneNumber"}
        value={value}
      />
      <ZookButton
        busy={busy === "request"}
        disabled={!trimmedValue || busy === "verify"}
        fullWidth
        icon="send-outline"
        onPress={requestOtp}
        size="sm"
        tone="secondary"
      >
        {currentValue ? `Update ${title}` : `Add ${title}`}
      </ZookButton>
      {requestedFor ? (
        <View style={styles.otpBlock}>
          <OtpInput
            accessibilityLabel={`Enter ${title.toLowerCase()} OTP`}
            disabled={busy === "verify"}
            label={`OTP for ${requestedFor}`}
            onChange={setCode}
            onComplete={(completeCode) => void verifyOtp(completeCode)}
            testID={`account-${kind}-otp`}
            value={code}
          />
          <ZookButton
            busy={busy === "verify"}
            disabled={code.length !== 6 || busy === "request"}
            fullWidth
            icon="checkmark-circle-outline"
            onPress={() => void verifyOtp()}
            size="sm"
          >
            Verify {title}
          </ZookButton>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.feedback.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  contactBlock: { gap: spacing.sm },
  error: typography.caption,
  form: { gap: spacing.md },
  helper: typography.small,
  list: { gap: 4 },
  otpBlock: { gap: spacing.sm },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: typography.cardTitle,
});
