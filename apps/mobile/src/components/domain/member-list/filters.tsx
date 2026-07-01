import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Input } from "@/components/primitives";
import { useT, type TranslationKey } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { MemberListFilter } from "./types";

type Translate = (key: TranslationKey) => string;

const statusLabelKeys: Record<Exclude<MemberListFilter, { kind: "all" | "tag" }>["status"], TranslationKey> = {
  active: "memberList.status.active",
  expired: "memberList.status.expired",
  expiring: "memberList.status.expiring",
  pending: "memberList.status.pending",
};

function filterLabel(filter: MemberListFilter, t: Translate) {
  if (filter.kind === "all") return t("memberList.all");
  if (filter.kind === "status") return t(statusLabelKeys[filter.status]);
  return filter.tag;
}

function filterKey(filter: MemberListFilter) {
  return filter.kind === "all"
    ? "all"
    : filter.kind === "status"
      ? `status:${filter.status}`
      : `tag:${filter.tag}`;
}

export function MemberListFilters({
  availableFilters,
  filter,
  onFilterChange,
  onSearchChange,
  resultSummary,
  searchPlaceholder,
  searchValue,
  searchTestID,
}: {
  availableFilters?: MemberListFilter[];
  filter?: MemberListFilter;
  onFilterChange?: (filter: MemberListFilter) => void;
  onSearchChange?: (value: string) => void;
  resultSummary?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  searchTestID?: string;
}) {
  const { palette } = useTheme();
  const t = useT();
  const activeKey = filterKey(filter ?? { kind: "all" });
  return (
    <View style={styles.stack}>
      {onSearchChange ? (
        <Input
          testID={searchTestID}
          value={searchValue ?? ""}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder ?? t("memberList.searchMembers")}
          leading={<Ionicons name="search-outline" size={17} color={palette.text.secondary} />}
          inputWrapperStyle={styles.searchInputWrapper}
          inputStyle={styles.searchInput}
        />
      ) : null}
      {availableFilters?.length && onFilterChange ? (
        <View style={styles.filterBlock}>
          {resultSummary ? (
            <Text numberOfLines={1} style={[styles.resultSummary, { color: palette.text.tertiary }]}>
              {resultSummary}
            </Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
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
                      backgroundColor: selected
                        ? palette.surface.accentSoft
                        : palette.surface.default,
                      borderColor: selected ? palette.accent.strong : palette.border.default,
                    },
                    pressed ? styles.filterChipPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selected ? palette.accent.base : palette.text.secondary },
                    ]}
                  >
                    {filterLabel(item, t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xs },
  filterBlock: { gap: spacing.xxs },
  filterRow: { gap: spacing.xs, paddingRight: spacing.sm },
  resultSummary: typography.small,
  filterChip: {
    alignItems: "center",
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  searchInputWrapper: {
    minHeight: 40,
    borderRadius: 14,
  },
  searchInput: {
    minHeight: 34,
    paddingVertical: 5,
  },
  filterChipPressed: {
    opacity: 0.84,
  },
  filterChipText: typography.caption,
});
