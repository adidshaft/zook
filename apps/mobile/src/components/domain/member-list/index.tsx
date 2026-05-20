import { StyleSheet, View } from "react-native";

import { QueryErrorState } from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { spacing } from "@/lib/theme";
import { MemberListEmptyState } from "./empty-state";
import { MemberListFilters } from "./filters";
import { MemberListRow } from "./row";
import type { MemberListProps } from "./types";

export type { MemberListFilter, MemberListProps, MemberRowItem } from "./types";

export function MemberList({
  availableFilters,
  emptyState = { title: "No members found", subtitle: "Try a different search or filter." },
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
  testID,
}: MemberListProps) {
  return (
    <View testID={testID} style={styles.stack}>
      <MemberListFilters
        availableFilters={availableFilters}
        filter={filter}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        searchValue={searchValue}
      />
      {isLoading ? <TrainerClientsSkeleton /> : null}
      {isError ? <QueryErrorState error={new Error("Members could not load.")} onRetry={onRetry} /> : null}
      {!isLoading && !isError && !items.length ? (
        <MemberListEmptyState title={emptyState.title} subtitle={emptyState.subtitle} />
      ) : null}
      {!isLoading && !isError
        ? items.map((item, index) => (
            <MemberListRow
              key={item.id}
              item={item}
              onPress={() => onPressMember(item)}
              onRevealPhone={onRevealPhone ? () => onRevealPhone(item) : undefined}
              testID={index === 0 ? `${testID ?? "member-list"}-row-first` : `${testID ?? "member-list"}-row-${item.id}`}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
