import { ScrollView, StyleSheet, Text, View } from "react-native";

import { MobileHeader, SegmentedControl, ZookScreen } from "@/components/primitives";
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
      <ZookScreen testID="settings-language-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Language" subtitle="Choose app language" showProfileShortcut={false} />
          <SegmentedControl
            options={options}
            value={preference}
            onChange={(value) => void setLocalePreference(value)}
          />
          <Text style={[styles.comingSoonHeader, { color: palette.text.secondary }]}>
            More languages coming soon
          </Text>
          <View style={styles.languagePreviewRow}>
            {comingSoonLanguages.map((name) => (
              <View
                key={name}
                style={[
                  styles.languagePreview,
                  {
                    backgroundColor: palette.surface.default,
                    borderColor: palette.border.subtle,
                  },
                ]}
              >
                <Text style={[styles.languagePreviewText, { color: palette.text.tertiary }]}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  comingSoonHeader: { ...typography.small, marginTop: spacing.sm },
  languagePreviewRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  languagePreview: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center",
    opacity: 0.72,
  },
  languagePreviewText: typography.caption,
});
