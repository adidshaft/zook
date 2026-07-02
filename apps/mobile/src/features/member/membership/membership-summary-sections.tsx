import { StyleSheet, Text, View } from "react-native";
import { Card, ZookButton } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export function MembershipStatsRow({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const { palette } = useTheme();
  if (!items.length) return null;
  return (
    <View style={styles.membershipStatsRow}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.membershipStatChip,
            {
              backgroundColor: palette.bg.sunken,
              borderColor: palette.border.subtle,
            },
          ]}
        >
          <Text style={[styles.membershipStatValue, { color: palette.text.primary }]}>
            {item.value}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.membershipStatLabel, { color: palette.text.secondary }]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function EmptyMembershipCard({
  body,
  cta,
  title,
}: {
  body: string;
  cta: string;
  title: string;
}) {
  const { palette } = useTheme();
  return (
    <Card variant="compact" contentStyle={styles.emptyContent}>
      <View style={styles.emptyCopy}>
        <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>{title}</Text>
        <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>{body}</Text>
      </View>
      <ZookButton testID="membership-find-gyms" href="/gyms" icon="search-outline">
        {cta}
      </ZookButton>
    </Card>
  );
}

const styles = StyleSheet.create({
  membershipStatsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  membershipStatChip: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 2,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  membershipStatValue: {
    ...typography.bodyStrong,
    lineHeight: 19,
  },
  membershipStatLabel: {
    ...typography.caption,
    maxWidth: "100%",
    textAlign: "center",
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    ...typography.cardTitle,
  },
  emptyBody: {
    ...typography.body,
    textAlign: "center",
  },
});
