import { Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MobileHeader, ZookScreen } from "@/components/primitives";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

const options: Array<{ label: string; value: LocalePreference }> = [
  { label: "System", value: "system" },
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
];

const comingSoonLanguages = ["தமிழ்", "తెలుగు", "ಕನ್ನಡ", "मराठी", "বাংলা"];

export default function LanguageSettingsScreen() {
  const { preference, setLocalePreference } = useI18n();
  const { palette } = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-language-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Language" subtitle="Choose app language" showProfileShortcut={false} />
          <View style={styles.optionRow}>
            {options.map((option) => (
              <OptionChip key={option.value} label={option.label} selected={preference === option.value} onPress={() => void setLocalePreference(option.value)} />
            ))}
          </View>
          <Text style={[styles.comingSoonHeader, { color: palette.text.secondary }]}>More languages — Coming Soon!</Text>
          <View style={styles.optionRow}>
            {comingSoonLanguages.map((name) => (
              <View key={name} style={[styles.chip, styles.comingSoonChip, { backgroundColor: palette.surface.default, borderColor: palette.border.subtle }]}>
                <Text style={[styles.chipText, { color: palette.text.tertiary }]}>{name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function OptionChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const { palette } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.chip, { backgroundColor: selected ? palette.accent.base : palette.surface.default, borderColor: selected ? palette.accent.base : palette.border.default }]}>
      <Text style={[styles.chipText, { color: selected ? palette.text.onAccent : palette.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderRadius: 16, borderWidth: 1, minHeight: 46, paddingHorizontal: 16, justifyContent: "center" },
  chipText: typography.cardTitle,
  comingSoonHeader: { ...typography.small, marginTop: spacing.sm },
  comingSoonChip: { minHeight: 42 },
});
