import { ScrollView, StyleSheet, Text } from "react-native";

import { AppHeader, SegmentedControl, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { titleCaseFromCode } from "@/lib/formatting";
import { useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme, type ThemePreference } from "@/lib/theme/index";

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function AppearanceSettingsScreen() {
  const { defaultRolePreference, setDefaultRole } = useAuth();
  const ctx = useRoleContext();
  const { palette, preference, setPreference } = useTheme();
  const roleOptions =
    ctx?.availableRoles.map((role) => ({
      label: titleCaseFromCode(role),
      value: role,
    })) ?? [];
  const selectedRole = defaultRolePreference ?? ctx?.role ?? roleOptions[0]?.value;
  return (
    <>
      <ZookScreen testID="settings-appearance-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title="Appearance" showBack />
          <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>Theme</Text>
          <SegmentedControl
            options={themeOptions}
            value={preference}
            onChange={(value) => void setPreference(value)}
          />
          {roleOptions.length > 1 && selectedRole ? (
            <>
              <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>Default role</Text>
              <SegmentedControl
                options={roleOptions}
                value={selectedRole}
                onChange={(role) => void setDefaultRole(role)}
              />
            </>
          ) : null}
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
  sectionLabel: typography.caption,
});
