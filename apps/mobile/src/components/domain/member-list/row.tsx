import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, normalizePillTone, Pill, StatusChip, ZookButton } from "@/components/primitives";
import { formatInitials, formatRedactedPhone } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { MemberRowItem } from "./types";

export function MemberListRow({
  item,
  onPress,
  onRevealPhone,
  testID,
}: {
  item: MemberRowItem;
  onPress: () => void;
  onRevealPhone?: () => void;
  testID?: string;
}) {
  const { palette } = useTheme();
  const t = useT();
  const showReveal = Boolean(item.phone && onRevealPhone && !item.phoneRevealed);
  return (
    <Card
      testID={testID}
      variant="compact"
      pressable
      onPress={onPress}
      contentStyle={styles.content}
    >
      {item.avatarUrl ? (
        <Image
          source={{ uri: item.avatarUrl }}
          style={[styles.avatarImage, { backgroundColor: palette.surface.default }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: palette.accent.base }]}>
          <Text style={[styles.avatarText, { color: palette.text.onAccent }]}>
            {formatInitials(item.name, item.email)}
          </Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.name, { color: palette.text.primary }]}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={[styles.email, { color: palette.text.secondary }]}>
          {[item.email, item.meta].filter(Boolean).join(" · ") || t("memberList.noEmail")}
        </Text>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={[styles.phoneText, { color: palette.text.secondary }]}>
            {item.phoneRevealed ? (item.phone ?? t("memberList.noPhone")) : formatRedactedPhone(item.phone)}
          </Text>
          {showReveal ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onRevealPhone?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("memberList.revealPhoneFor", { name: item.name })}
              style={[styles.revealButton, { borderColor: palette.border.default }]}
            >
              <Text style={[styles.revealText, { color: palette.accent.base }]}>{t("memberList.reveal")}</Text>
            </Pressable>
          ) : null}
          {item.badges?.map((badge) => (
            <Pill key={badge.label} tone={normalizePillTone(badge.tone)}>
              {badge.label}
            </Pill>
          ))}
        </View>
      </View>
      <View style={styles.trailing}>
        <StatusChip status={item.status} />
        {item.action ? (
          <ZookButton
            size="sm"
            variant="secondary"
            onPress={() => item.action?.onPress()}
          >
            {item.action.label}
          </ZookButton>
        ) : null}
        <Ionicons name="chevron-forward" size={17} color={palette.text.secondary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: typography.caption,
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: typography.cardTitle,
  email: typography.small,
  metaRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  phoneText: typography.small,
  revealButton: {
    alignItems: "center",
    minHeight: 44,
    minWidth: 76,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  revealText: typography.caption,
  trailing: {
    width: 118,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
