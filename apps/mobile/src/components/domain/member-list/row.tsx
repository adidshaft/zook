import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, normalizePillTone, Pill, StatusChip } from "@/components/primitives";
import { formatInitials, formatRedactedPhone } from "@/lib/formatting";
import { useT, type TranslationKey } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { MemberRowItem } from "./types";

const statusLabelKeys: Record<MemberRowItem["status"], TranslationKey> = {
  active: "memberList.status.active",
  expired: "memberList.status.expired",
  expiring: "memberList.status.expiring",
  pending: "memberList.status.pending",
};

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
  const subtitle = item.meta || item.email || t("memberList.noEmail");
  const secondaryContact = item.meta && item.email ? item.email : null;
  const visibleBadges = item.badges?.slice(0, 1) ?? [];
  const hiddenBadgeCount = Math.max((item.badges?.length ?? 0) - visibleBadges.length, 0);
  return (
    <Card
      testID={testID}
      variant="compact"
      padding={10}
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
        <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={[styles.email, { color: palette.text.secondary }]}>
          {subtitle}
        </Text>
        <View style={styles.metaRow}>
          <StatusChip
            style={styles.statusChip}
            textStyle={styles.statusChipText}
          >
            {t(statusLabelKeys[item.status])}
          </StatusChip>
          {secondaryContact ? (
            <Text numberOfLines={1} style={[styles.contactText, { color: palette.text.tertiary }]}>
              {secondaryContact}
            </Text>
          ) : null}
          {showReveal || item.phoneRevealed ? (
            <Text numberOfLines={1} style={[styles.phoneText, { color: palette.text.secondary }]}>
              {item.phoneRevealed
                ? (item.phone ?? t("memberList.noPhone"))
                : formatRedactedPhone(item.phone)}
            </Text>
          ) : null}
          {showReveal ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onRevealPhone?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("memberList.revealPhoneFor", { name: item.name })}
              hitSlop={8}
              style={[styles.revealButton, { borderColor: palette.border.default }]}
            >
              <Ionicons name="eye-outline" size={15} color={palette.accent.base} />
            </Pressable>
          ) : null}
          {visibleBadges.map((badge) => (
            <Pill key={badge.label} tone={normalizePillTone(badge.tone)}>
              {badge.label}
            </Pill>
          ))}
          {hiddenBadgeCount ? (
            <Pill tone="neutral">+{hiddenBadgeCount}</Pill>
          ) : null}
        </View>
      </View>
      <View style={styles.trailing}>
        {item.action ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              item.action?.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={item.action.label}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconAction,
              { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              pressed ? styles.iconActionPressed : null,
            ]}
          >
            <Ionicons name="notifications-outline" size={16} color={palette.accent.base} />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={17} color={palette.text.secondary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 28, height: 28, borderRadius: 14 },
  avatarText: typography.caption,
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    ...typography.cardTitle,
    fontSize: 14,
    lineHeight: 18,
  },
  email: typography.small,
  metaRow: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "nowrap",
  },
  statusChip: {
    maxWidth: 96,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusChipText: typography.caption,
  contactText: {
    ...typography.small,
    flexShrink: 1,
    maxWidth: 118,
  },
  phoneText: {
    ...typography.small,
    flexShrink: 1,
    maxWidth: 96,
  },
  revealButton: {
    alignItems: "center",
    minHeight: 26,
    minWidth: 30,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 7,
    justifyContent: "center",
  },
  trailing: {
    width: 30,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.xs,
  },
  iconAction: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
