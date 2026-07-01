import type { AuthOrganizationSummary, AuthSessionUser } from "@zook/core";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, IconBubble } from "@/components/primitives";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  return (
    <Card variant="selected" contentStyle={styles.card}>
      <IconBubble icon="person-outline" tone="lime" size={52} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
          {user?.name ?? t("member.you.memberFallback")}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
          {org?.name ?? t("member.you.noGymSelected")}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("member.you.editProfile")}
        onPress={onEdit}
        style={({ pressed }) => [
          styles.editAction,
          {
            borderColor: palette.border.subtle,
            backgroundColor: palette.surface.raised,
          },
          pressed ? styles.editActionPressed : null,
        ]}
      >
        <Ionicons name="create-outline" size={18} color={palette.text.secondary} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 88 },
  copy: { flex: 1, gap: 4 },
  name: typography.cardTitle,
  meta: typography.small,
  editAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  editActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
