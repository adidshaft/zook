import { StyleSheet, Text, View } from "react-native";

import { Card, IconBubble, ZookButton } from "@/components/primitives";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export function MembershipSummary({
  membership,
  onViewDetail,
}: {
  membership?: MemberHomeData["activeMembership"];
  onViewDetail: () => void;
}) {
  const { palette } = useTheme();
  const daysLeft =
    typeof membership?.daysLeft === "number" ? `${membership.daysLeft} days left` : "Status pending";
  return (
    <Card variant="compact" contentStyle={styles.card}>
      <IconBubble icon="card-outline" tone={membership ? "lime" : "amber"} size={42} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text.primary }]}>
          {membership ? "Active membership" : "No active membership"}
        </Text>
        <Text style={[styles.meta, { color: palette.text.secondary }]}>
          {membership?.status ?? daysLeft}
        </Text>
      </View>
      <ZookButton onPress={onViewDetail} variant="secondary" size="sm">
        View
      </ZookButton>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: { flex: 1, gap: 3 },
  title: typography.cardTitle,
  meta: typography.small,
});
