import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Card } from "@/components/primitives";
import type { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

type Translate = ReturnType<typeof useT>;

export function ManualCodeCard({
  busy,
  codeDigits,
  codeDigitsRef,
  codePlaceholderColor,
  codePrefix,
  codePrefixRef,
  codeReady,
  t,
  onBackToScanner,
  onDigitsChange,
  onPrefixChange,
  onSubmitCode,
}: {
  busy: boolean;
  codeDigits: string;
  codeDigitsRef: RefObject<TextInput | null>;
  codePlaceholderColor: string;
  codePrefix: string;
  codePrefixRef: RefObject<TextInput | null>;
  codeReady: boolean;
  t: Translate;
  onBackToScanner: () => void;
  onDigitsChange: (value: string) => void;
  onPrefixChange: (value: string) => void;
  onSubmitCode: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Card variant="compact" contentStyle={styles.codeContent}>
      <View style={styles.codeHeader}>
        <Text style={[styles.codeTitle, { color: palette.text.primary }]}>
          {t("member.scan.enterCheckInCode")}
        </Text>
        <Text style={[styles.codeHint, { color: palette.text.secondary }]}>
          {t("member.scan.codeHint")}
        </Text>
      </View>
      <View style={styles.codeRow}>
        <TextInput
          testID="scan-code-prefix"
          ref={codePrefixRef}
          value={codePrefix}
          onChangeText={onPrefixChange}
          accessibilityLabel={t("member.scan.codePrefix")}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={2}
          placeholder="AB"
          placeholderTextColor={codePlaceholderColor}
          style={[
            styles.codeInput,
            styles.codePrefixInput,
            {
              backgroundColor: palette.bg.sunken,
              borderColor: palette.border.default,
              color: palette.text.primary,
            },
          ]}
          returnKeyType="next"
          onSubmitEditing={() => codeDigitsRef.current?.focus()}
        />
        <Text style={[styles.codeDivider, { color: palette.text.secondary }]}>-</Text>
        <TextInput
          testID="scan-code-digits"
          ref={codeDigitsRef}
          value={codeDigits}
          onChangeText={onDigitsChange}
          accessibilityLabel={t("member.scan.codeDigits")}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="1234"
          placeholderTextColor={codePlaceholderColor}
          style={[
            styles.codeInput,
            styles.codeDigitsInput,
            {
              backgroundColor: palette.bg.sunken,
              borderColor: palette.border.default,
              color: palette.text.primary,
            },
          ]}
          returnKeyType="done"
          onSubmitEditing={onSubmitCode}
        />
        <Pressable
          testID="scan-submit-code"
          onPress={onSubmitCode}
          disabled={busy || !codeReady}
          accessibilityRole="button"
          accessibilityLabel={t("member.scan.checkCodeAccessibility")}
          style={[
            styles.codeButton,
            { backgroundColor: palette.accent.base },
            busy || !codeReady ? styles.codeButtonDisabled : null,
          ]}
        >
          <Ionicons name="arrow-forward" size={18} color={palette.text.onAccent} />
        </Pressable>
      </View>
      {!codeReady && (codePrefix.length > 0 || codeDigits.length > 0) ? (
        <Text style={[styles.codeValidationHint, { color: palette.text.secondary }]}>
          {codePrefix.length < 2
            ? t("member.scan.needTwoLetters")
            : t("member.scan.needFourNumbers")}
        </Text>
      ) : null}
      {busy ? (
        <Text style={[styles.checkingText, { color: palette.text.secondary }]}>
          <Text style={[styles.checkingDot, { color: palette.accent.base }]}>● </Text>
          {t("member.scan.checkingCode")}
        </Text>
      ) : null}
      <Pressable
        testID="scan-back-to-camera"
        onPress={onBackToScanner}
        accessibilityRole="button"
        accessibilityLabel={t("member.scan.returnToQrScannerAccessibility")}
        style={({ pressed }) => [styles.backToScannerLink, pressed ? styles.linkPressed : null]}
      >
        <Ionicons name="qr-code-outline" size={15} color={palette.accent.strong} />
        <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>
          {t("member.scan.backToCameraScanner")}
        </Text>
      </Pressable>
    </Card>
  );
}
