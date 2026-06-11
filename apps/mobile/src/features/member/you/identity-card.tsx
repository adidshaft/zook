import type { AuthOrganizationSummary, AuthSessionUser } from "@zook/core";
import { StyleSheet, Text, View } from "react-native";

import { Card, IconBubble, ZookButton } from "@/components/primitives";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export function IdentityCard({
  onEdit,
  org,
  user,
}: {
  onEdit: () => void;
  org?: AuthOrganizationSummary | null;
  user?: AuthSessionUser | null;
}) {
  const { palette } = useTheme();
  return (
    <Card variant="selected" contentStyle={styles.card}>
      <IconBubble icon="person-outline" tone="lime" size={52} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
          {user?.name ?? "Member"}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
          {org?.name ?? "No gym selected"}
        </Text>
      </View>
      <ZookButton onPress={onEdit} variant="secondary" size="sm">
        Edit
      </ZookButton>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 88 },
  copy: { flex: 1, gap: 4 },
  name: typography.title,
  meta: typography.small,
});
