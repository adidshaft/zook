import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typography, useTheme } from "@/lib/theme";

export type GymProfileTab = "plans" | "overview" | "reviews";

export type GymProfileTabItem = {
  key: GymProfileTab;
  label: string;
};

export function GymProfileTabs({
  activeTab,
  items,
  onSelectTab,
}: {
  activeTab: GymProfileTab;
  items: GymProfileTabItem[];
  onSelectTab: (tab: GymProfileTab) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.tabs, { backgroundColor: palette.surface.default }]}>
      {items.map((item) => {
        const selected = activeTab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelectTab(item.key)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected ? palette.surface.accentSoft : "transparent",
                borderColor: selected ? palette.border.focus : palette.border.subtle,
              },
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {
                  color: selected ? palette.accent.base : palette.text.secondary,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: 18,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
  },
  tabPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  tabText: {
    ...typography.small,
    fontFamily: "Inter_700Bold",
  },
});
