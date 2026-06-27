import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function ReferralCard({
  code,
  maxUses,
  onShare,
  onCopy,
  redemptions,
  rewardsCount,
}: {
  code: string;
  maxUses?: number | null;
  onShare: () => void;
  onCopy?: () => void;
  redemptions: number;
  rewardsCount: number;
}) {
  const { palette } = useTheme();
  const t = useT();
  const rewardsLabel = t(rewardsCount === 1 ? "referral.card.rewardCount" : "referral.card.rewardCount_plural", {
    count: rewardsCount,
  });
  return (
    <Card variant="compact" contentStyle={styles.content}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text.primary }]}>{t("referral.card.referFriend")}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
          {t("referral.card.used", {
            used: redemptions,
            max: maxUses ?? t("referral.card.unlimited"),
            rewards: rewardsLabel,
          })}
        </Text>
        {onCopy ? (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={t("referral.card.copyCodeAccessibility", { code })}
            hitSlop={6}
            style={({ pressed }) => (pressed ? styles.codePressed : null)}
          >
            <Text style={[styles.code, { color: palette.accent.base }]}>{code}</Text>
          </Pressable>
        ) : (
          <Text selectable style={[styles.code, { color: palette.accent.base }]}>
            {code}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={t("referral.card.shareCode")}
        style={({ pressed }) => [
          styles.shareButton,
          { backgroundColor: palette.accent.fill },
          pressed ? styles.shareButtonPressed : null,
        ]}
      >
        <Ionicons name="share-outline" size={18} color={palette.text.onAccent} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: { flex: 1, gap: 2 },
  title: typography.cardTitle,
  meta: typography.small,
  code: { ...typography.cardTitle, letterSpacing: 1 },
  codePressed: { opacity: 0.7 },
  shareButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  shareButtonPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
});
