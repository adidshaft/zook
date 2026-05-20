import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard, IconBubble, ListRow, SectionHeader } from "@/components/primitives";
import { colors, typography } from "@/lib/theme";

export type AttentionItem = {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  tone: "neutral" | "lime" | "amber" | "red" | "blue" | "violet";
  icon: "checkmark-done-outline" | "card-outline" | "cube-outline" | "time-outline";
  target: "/owner/approvals" | "/owner/revenue" | "/owner/stock";
};

export function AttentionCard({ items }: { items: AttentionItem[] }) {
  const router = useRouter();

  return (
    <>
      <SectionHeader title="Needs attention" />
      <GlassCard contentStyle={styles.stack}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.replace(item.target)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title}`}
            style={styles.attentionRow}
          >
            <ListRow
              title={item.title}
              subtitle={item.subtitle}
              leading={<IconBubble icon={item.icon} tone={item.tone} />}
              trailing={
                <View style={styles.attentionTrailing}>
                  <Text
                    style={
                      item.count
                        ? item.tone === "amber"
                          ? styles.attentionUrgent
                          : styles.attentionAction
                        : styles.attentionQuiet
                    }
                  >
                    {item.count ? "Review" : "Open"}
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                </View>
              }
            />
          </Pressable>
        ))}
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  attentionRow: {
    borderRadius: 16,
  },
  attentionTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attentionAction: {
    color: colors.brandLime,
    ...typography.caption,
  },
  attentionUrgent: {
    color: colors.warning,
    ...typography.caption,
  },
  attentionQuiet: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
