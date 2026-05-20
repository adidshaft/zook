import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ZookButton } from "@/components/primitives";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { legacyColors } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type LanguageOption = {
  value: LocalePreference;
  label: string;
  caption: string;
};

const languageOptions: LanguageOption[] = [
  { value: "system", label: "Use device language", caption: "Match your phone settings" },
  { value: "en", label: "English", caption: "English" },
  { value: "hi", label: "हिंदी", caption: "Hindi" },
];

export default function OnboardingLanguageStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setLocalePreference } = useI18n();
  const [selected, setSelected] = useState<LocalePreference>(preference);
  const [busy, setBusy] = useState(false);

  async function continueOn() {
    setBusy(true);
    try {
      await setLocalePreference(selected);
      router.push("/onboarding/value-props" as never);
    } catch {
      showToast({
        title: "Couldn't save language",
        message: "Try again.",
        tone: "amber",
        haptic: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      testID="onboarding-language-screen"
      style={[styles.screen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Pick your language</Text>
        <Text style={styles.kicker}>You can change this any time in Settings.</Text>
      </View>

      <View style={styles.list}>
        {languageOptions.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              testID={`onboarding-language-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              onPress={() => setSelected(option.value)}
              style={[styles.option, isSelected ? styles.optionSelected : null]}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionCaption}>{option.caption}</Text>
              </View>
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? legacyColors.lime : legacyColors.muted}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <ZookButton
          testID="onboarding-language-continue"
          onPress={continueOn}
          disabled={busy}
        >
          {busy ? "Saving..." : "Continue"}
        </ZookButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: legacyColors.bg,
    paddingHorizontal: 24,
  },
  header: {
    gap: 8,
  },
  brand: {
    color: legacyColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 32,
    lineHeight: 38,
  },
  kicker: {
    color: legacyColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  option: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
  },
  optionSelected: {
    borderColor: legacyColors.limeBorder,
    backgroundColor: legacyColors.accentPanel,
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    color: legacyColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  optionCaption: {
    color: legacyColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    gap: 12,
  },
});
