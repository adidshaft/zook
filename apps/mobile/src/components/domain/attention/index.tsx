import { StyleSheet } from "react-native";

import { EmptyState, GlassCard, SectionHeader } from "@/components/primitives";
import { spacing } from "@/lib/theme";
import { AttentionListItem } from "./item";
import type { AttentionCardProps } from "./types";

export type { AttentionCardProps, AttentionItem } from "./types";

export function AttentionCard({
  emptyState = { title: "Nothing needs attention", subtitle: "You are all caught up." },
  items,
  title = "Needs attention",
}: AttentionCardProps) {
  return (
    <>
      <SectionHeader title={title} />
      <GlassCard contentStyle={styles.stack}>
        {items.length ? (
          items.map((item) => <AttentionListItem key={item.id} item={item} />)
        ) : (
          <EmptyState title={emptyState.title} body={emptyState.subtitle ?? ""} />
        )}
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
