import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/primitives";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { MemberListFilter } from "./types";

function filterLabel(filter: MemberListFilter) {
  if (filter.kind === "all") return "All";
  if (filter.kind === "status") return filter.status[0].toUpperCase() + filter.status.slice(1);
  return filter.tag;
}

function filterKey(filter: MemberListFilter) {
  return filter.kind === "all" ? "all" : filter.kind === "status" ? `status:${filter.status}` : `tag:${filter.tag}`;
}

export function MemberListFilters({
  availableFilters,
  filter,
  onFilterChange,
  onSearchChange,
  searchValue,
  searchTestID,
}: {
  availableFilters?: MemberListFilter[];
  filter?: MemberListFilter;
  onFilterChange?: (filter: MemberListFilter) => void;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  searchTestID?: string;
}) {
  const { palette } = useTheme();
  const activeKey = filterKey(filter ?? { kind: "all" });
  return (
    <View style={styles.stack}>
      {onSearchChange ? (
        <Input
          testID={searchTestID}
          value={searchValue ?? ""}
          onChangeText={onSearchChange}
          placeholder="Search members"
          leading={<Ionicons name="search-outline" size={17} color={palette.text.secondary} />}
        />
      ) : null}
      {availableFilters?.length && onFilterChange ? (
        <View style={styles.filterRow}>
          {availableFilters.map((item) => {
            const selected = activeKey === filterKey(item);
            return (
              <Pressable
                key={filterKey(item)}
                onPress={() => onFilterChange(item)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default,
                    borderColor: selected ? palette.accent.strong : palette.border.default,
                  },
                  pressed ? styles.filterChipPressed : null,
                ]}
              >
                <Text style={[styles.filterChipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>
                  {filterLabel(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterChip: {
    alignItems: "center",
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  filterChipPressed: {
    opacity: 0.84,
  },
  filterChipText: typography.caption,
});
