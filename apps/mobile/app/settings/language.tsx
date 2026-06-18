import { ScrollView, StyleSheet } from "react-native";

import { AppHeader, SegmentedControl, ZookScreen } from "@/components/primitives";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

const options: Array<{ label: string; value: LocalePreference }> = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
];

export default function LanguageSettingsScreen() {
  const { preference, setLocalePreference } = useI18n();
  return (
    <>
      <ZookScreen testID="settings-language-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title="Language" subtitle="Choose app language" showProfileShortcut={false} showBack />
          <SegmentedControl
            options={options}
            value={preference}
            onChange={(value) => void setLocalePreference(value)}
          />
        </ScrollView>
      </ZookScreen>
    </>
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
});
