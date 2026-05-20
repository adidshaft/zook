import type { Role } from "@zook/core";
import { Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard, MobileHeader, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
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
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-appearance-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Appearance" subtitle="Theme and default role" showProfileShortcut={false} />
          <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>Theme</Text>
          <View style={styles.optionRow}>
            {themeOptions.map((option) => (
              <OptionChip key={option.value} label={option.label} selected={preference === option.value} onPress={() => void setPreference(option.value)} />
            ))}
          </View>
          {(ctx?.availableRoles.length ?? 0) > 1 ? (
            <>
              <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>Default role</Text>
              <View style={styles.optionRow}>
                {ctx?.availableRoles.map((role) => (
                  <OptionChip key={role} label={titleCase(role)} selected={(defaultRolePreference ?? ctx.role) === role} onPress={() => void setDefaultRole(role as Role)} />
                ))}
              </View>
            </>
          ) : null}
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

function titleCase(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  sectionLabel: typography.caption,
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderRadius: 16, borderWidth: 1, minHeight: 46, paddingHorizontal: 16, justifyContent: "center" },
  chipText: typography.cardTitle,
});
