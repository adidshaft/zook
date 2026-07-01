import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { QueryErrorState } from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { useT } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";
import { MemberListEmptyState } from "./empty-state";
import { MemberListFilters } from "./filters";
import { MemberListRow } from "./row";
import type { MemberListProps } from "./types";

export type { MemberListFilter, MemberListProps, MemberRowItem } from "./types";

export function MemberList({
  availableFilters,
  emptyState,
  filter,
  isError,
  isLoading,
  items,
  onFilterChange,
  onPressMember,
  onRetry,
  onRevealPhone,
  onSearchChange,
  resultSummary,
  searchPlaceholder,
  searchValue,
  searchTestID,
  testID,
  refreshing,
  onRefresh,
  header,
  scrollEnabled = true,
  style,
}: MemberListProps) {
  const { palette } = useTheme();
  const t = useT();
  const resolvedEmptyState = emptyState ?? {
    title: t("memberList.noMembers"),
    subtitle: t("memberList.tryDifferentSearch"),
  };
  const renderItem = ({ item, index }: { item: (typeof items)[number]; index: number }) => (
    <MemberListRow
      item={item}
      onPress={() => onPressMember(item)}
      onRevealPhone={onRevealPhone ? () => onRevealPhone(item) : undefined}
      testID={
        index === 0
          ? `${testID ?? "member-list"}-row-first`
          : `${testID ?? "member-list"}-row-${item.id}`
      }
    />
  );

  return (
    <FlatList
      testID={testID}
      style={style}
      data={isLoading || isError ? [] : items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent.base}
            colors={[palette.accent.base]}
          />
        ) : undefined
      }
      ListHeaderComponent={
        <View style={styles.headerContainer}>
          {header}
          <MemberListFilters
            availableFilters={availableFilters}
            filter={filter}
            onFilterChange={onFilterChange}
            onSearchChange={onSearchChange}
            resultSummary={resultSummary}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            searchTestID={searchTestID}
          />
          {isLoading ? <TrainerClientsSkeleton /> : null}
          {isError ? (
            <QueryErrorState error={new Error(t("memberList.couldNotLoad"))} onRetry={onRetry} />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError ? (
          <MemberListEmptyState
            title={resolvedEmptyState.title}
            subtitle={resolvedEmptyState.subtitle}
          />
        ) : null
      }
      contentContainerStyle={[
        styles.listContent,
        !scrollEnabled ? styles.embeddedListContent : null,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingBottom: 96,
  },
  embeddedListContent: {
    paddingBottom: 0,
  },
  separator: {
    height: spacing.xs,
  },
});
