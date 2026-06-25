import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Card,
  Input,
  ListRow,
  AppHeader,
  OtpInput,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export default function AccountSettingsScreen() {
  const { activeOrgId, biometricEnabled, refresh, session, setBiometricEnabled, token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  return (
    <>
      <ZookScreen testID="settings-account-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title={t("settings.account")} showBack />
          <Card variant="compact" contentStyle={styles.list}>
            <ListRow title={t("settings.name")} subtitle={session?.user.name ?? t("settings.notSet")} icon="person-outline" />
            <ListRow title={t("settings.email")} subtitle={session?.user.email ?? t("settings.notSet")} icon="mail-outline" />
            <ListRow title={t("settings.phone")} subtitle={session?.user.phone ?? t("settings.notSet")} icon="call-outline" />
          </Card>
          <Card variant="compact" contentStyle={styles.form}>
            <Text style={[styles.title, { color: palette.text.primary }]}>{t("settings.contactVerification")}</Text>
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
          </Card>
          <Card variant="compact" contentStyle={styles.toggleRow}>
            <Text style={[styles.title, { color: palette.text.primary }]}>{t("settings.biometricUnlock")}</Text>
            <ThemedSwitch
              value={biometricEnabled}
              onValueChange={(value) => void setBiometricEnabled(value)}
            />
          </Card>
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
  const t = useT();
  const [value, setValue] = useState(currentValue ?? "");
  const [code, setCode] = useState("");
  const [requestedFor, setRequestedFor] = useState<string | undefined>();
  const [busy, setBusy] = useState<"request" | "verify" | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const trimmedValue = value.trim();
  const title = kind === "email" ? t("settings.email") : t("settings.mobileNumber");
  const placeholder = kind === "email" ? t("settings.emailPlaceholder") : "+91 98765 43210";
  const keyboardType = kind === "email" ? "email-address" : "phone-pad";
  const inputMode = kind === "email" ? "email" : "tel";
  const helper = useMemo(() => {
    if (!currentValue) {
      return kind === "email" ? t("settings.noEmailLinked") : t("settings.noMobileLinked");
    }
    return t("settings.currentValue", { value: currentValue });
  }, [currentValue, kind, t]);

  async function requestOtp() {
    if (!token) {
      setError(t("settings.signInAgainContact"));
      return;
    }
    if (!trimmedValue) {
      setError(kind === "email" ? t("settings.enterEmail") : t("settings.enterMobile"));
      return;
    }
    setBusy("request");
    setError(undefined);
    setStatus(undefined);
    try {
      await memberApi.requestContactOtp({
        token,
        orgId: activeOrgId,
        identifier: trimmedValue,
      });
      setRequestedFor(trimmedValue);
      setCode("");
      setStatus(t("settings.enterCodeSentTo", { identifier: trimmedValue }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("settings.couldNotSendOtp"));
    } finally {
      setBusy(undefined);
    }
  }

  async function verifyOtp(nextCode = code) {
    if (!token || !requestedFor) {
      return;
    }
    if (nextCode.length !== 6) {
      setError(t("settings.enterSixDigitOtp"));
      return;
    }
    setBusy("verify");
    setError(undefined);
    setStatus(undefined);
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
      setStatus(t("settings.contactVerifiedUpdated", { contact: title }));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t("settings.couldNotVerifyOtp"));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <View style={styles.contactBlock}>
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        hint={helper}
        inputMode={inputMode}
        keyboardType={keyboardType}
        label={title}
        onChangeText={(nextValue) => {
          setValue(nextValue);
          setStatus(undefined);
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
        variant="secondary"
      >
        {currentValue ? t("settings.updateContact", { contact: title }) : t("settings.addContact", { contact: title })}
      </ZookButton>
      {requestedFor ? (
        <View style={styles.otpBlock}>
          <OtpInput
            accessibilityLabel={t("settings.enterContactOtp", { contact: title.toLowerCase() })}
            disabled={busy === "verify"}
            label={t("settings.otpFor", { identifier: requestedFor })}
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
            {t("settings.verifyContactType", { contact: title })}
          </ZookButton>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: palette.feedback.danger }]}>
          {error}
        </Text>
      ) : null}
      {!error && status ? (
        <Text style={[styles.helper, { color: palette.text.secondary }]}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  contactBlock: { gap: spacing.sm },
  error: typography.caption,
  form: { gap: spacing.md },
  helper: typography.small,
  list: { gap: 4 },
  otpBlock: { gap: spacing.sm },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: typography.cardTitle,
});
