import { ScrollView, StyleSheet } from "react-native";

import { AppHeader, SegmentedControl, ZookScreen } from "@/components/primitives";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

export default function LanguageSettingsScreen() {
  const { preference, setLocalePreference, t } = useI18n();
  const localizedOptions: Array<{ label: string; value: LocalePreference }> = [
    { label: t("settings.languageEnglish"), value: "en" },
    { label: t("settings.languageHindi"), value: "hi" },
  ];
  return (
    <>
      <ZookScreen testID="settings-language-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title={t("settings.language")} showBack />
          <SegmentedControl
            options={localizedOptions}
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
