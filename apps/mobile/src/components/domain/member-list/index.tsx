import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { QueryErrorState } from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { spacing, useTheme } from "@/lib/theme";
import { MemberListEmptyState } from "./empty-state";
import { MemberListFilters } from "./filters";
import { MemberListRow } from "./row";
import type { MemberListProps } from "./types";

export type { MemberListFilter, MemberListProps, MemberRowItem } from "./types";

export function MemberList({
  availableFilters,
  emptyState = { title: "No members", subtitle: "Try a different search or filter." },
  filter,
  isError,
  isLoading,
  items,
  onFilterChange,
  onPressMember,
  onRetry,
  onRevealPhone,
  onSearchChange,
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
  const renderItem = ({ item, index }: { item: typeof items[number]; index: number }) => (
    <MemberListRow
      item={item}
      onPress={() => onPressMember(item)}
      onRevealPhone={onRevealPhone ? () => onRevealPhone(item) : undefined}
      testID={index === 0 ? `${testID ?? "member-list"}-row-first` : `${testID ?? "member-list"}-row-${item.id}`}
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
            searchValue={searchValue}
            searchTestID={searchTestID}
          />
          {isLoading ? <TrainerClientsSkeleton /> : null}
          {isError ? <QueryErrorState error={new Error("Members could not load.")} onRetry={onRetry} /> : null}
        </View>
      }
      ListEmptyComponent={
        !isLoading && !isError ? (
          <MemberListEmptyState title={emptyState.title} subtitle={emptyState.subtitle} />
        ) : null
      }
      contentContainerStyle={[styles.listContent, !scrollEnabled ? styles.embeddedListContent : null]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 96,
  },
  embeddedListContent: {
    paddingBottom: 0,
  },
  separator: {
    height: spacing.md,
  },
});
