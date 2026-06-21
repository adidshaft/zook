import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { resolveAmenities, type AmenityCatalogItem } from "@/lib/amenity-catalog";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

function AmenityTile({ item, available }: { item: AmenityCatalogItem; available: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.tile,
        {
          borderColor: available ? palette.border.default : palette.border.subtle,
          backgroundColor: available ? palette.surface.default : palette.bg.sunken,
          opacity: available ? 1 : 0.55,
        },
      ]}
    >
      <Ionicons
        name={item.icon}
        size={20}
        color={available ? palette.accent.base : palette.text.tertiary}
      />
      <Text
        style={[styles.label, { color: available ? palette.text.primary : palette.text.tertiary }]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
      <Ionicons
        name={available ? "checkmark-circle" : "remove-circle-outline"}
        size={15}
        color={available ? palette.accent.base : palette.text.tertiary}
      />
    </View>
  );
}

/**
 * "What's inside" grid: shows every catalog amenity with a clear available /
 * not-available visual state so a prospective member can scan what a gym has —
 * and what it doesn't — at a glance.
 */
export function AmenityGrid({ sources }: { sources: Array<string | null | undefined> }) {
  const { palette } = useTheme();
  const { available, missing } = resolveAmenities(sources);
  const ordered = [...available, ...missing];
  const availableKeys = new Set(available.map((item) => item.key));

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.summary, { color: palette.text.secondary }]}>
          {available.length} of {ordered.length} amenities
        </Text>
      </View>
      <View style={styles.grid}>
        {ordered.map((item) => (
          <AmenityTile key={item.key} item={item} available={availableKeys.has(item.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "flex-end" },
  summary: { ...typography.small },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    alignItems: "center",
    borderRadius: radii.smallCard,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: "47%",
    flexGrow: 1,
    flexBasis: "47%",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  label: { ...typography.caption, flex: 1, minWidth: 0 },
});
