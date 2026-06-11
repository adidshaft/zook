import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ZookButton } from "@/components/primitives";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
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

const comingSoonLanguages = ["தமிழ்", "తెలుగు", "ಕನ್ನಡ", "मराठी", "বাংলা"];

export default function OnboardingLanguageStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setLocalePreference } = useI18n();
  const [selected, setSelected] = useState<LocalePreference>(preference);
  const [busy, setBusy] = useState(false);
  const { palette } = useTheme();

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
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.text.primary }]}>Pick your language</Text>
        <Text style={[styles.kicker, { color: palette.text.secondary }]}>You can change this any time in Settings.</Text>
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
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle },
                isSelected ? { borderColor: palette.accent.base, backgroundColor: palette.surface.accentSoft } : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, { color: palette.text.primary }]}>{option.label}</Text>
                <Text style={[styles.optionCaption, { color: palette.text.tertiary }]}>{option.caption}</Text>
              </View>
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? palette.accent.base : palette.text.tertiary}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.comingSoon}>
        <Text style={[styles.comingSoonHeader, { color: palette.text.secondary }]}>More languages on the way</Text>
        <View style={styles.comingSoonChips}>
          {comingSoonLanguages.map((name) => (
            <View
              key={name}
              style={[styles.comingSoonChip, { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle }]}
            >
              <Text style={[styles.comingSoonChipText, { color: palette.text.tertiary }]}>{name}</Text>
            </View>
          ))}
        </View>
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
    paddingHorizontal: 24,
  },
  header: {
    gap: 8,
  },
  brand: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 32,
    lineHeight: 38,
  },
  kicker: {
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
  },
  optionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  optionCaption: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  comingSoon: {
    gap: 10,
  },
  comingSoonHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  comingSoonChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comingSoonChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  comingSoonChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  footer: {
    gap: 12,
  },
});
