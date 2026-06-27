import { StyleSheet, View } from "react-native";

import { EmptyState, Card, QueryErrorState } from "@/components/primitives";
import { ReceptionQueueSkeleton } from "@/components/skeletons";
import { spacing } from "@/lib/theme";
import { ApprovalQueueCard } from "./card";
import type { ApprovalQueueProps } from "./types";

export type { ApprovalItem } from "./types";

export function ApprovalQueue({
  approvingId,
  emptyState = { title: "All caught up" },
  highlightedId,
  isError,
  isLoading,
  items,
  onApprove,
  onReject,
  onRetry,
  rejectingId,
  testID,
}: ApprovalQueueProps) {
  return (
    <View testID={testID} style={styles.stack}>
      {isLoading ? <ReceptionQueueSkeleton /> : null}
      {isError ? <QueryErrorState error={new Error("Approvals could not load.")} onRetry={onRetry} /> : null}
      {!isLoading && !isError && !items.length ? (
        <Card variant="compact">
          <EmptyState title={emptyState.title} body={emptyState.subtitle} />
        </Card>
      ) : null}
      {!isLoading && !isError
        ? items.map((item, index) => (
            <ApprovalQueueCard
              key={item.id}
              item={item}
              approving={approvingId === item.id}
              highlighted={highlightedId === item.id}
              rejecting={rejectingId === item.id}
              onApprove={() => onApprove(item.id)}
              onReject={onReject ? () => onReject(item.id) : undefined}
              testID={index === 0 ? `${testID ?? "approval-queue"}-row-first` : `${testID ?? "approval-queue"}-row-${item.id}`}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
