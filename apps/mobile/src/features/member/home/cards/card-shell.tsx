import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { Card, IconBubble, ZookButton } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function HomeCardShell({
  body,
  children,
  ctaHref,
  ctaLabel,
  icon,
  testID,
  title,
  tone = "lime",
}: PropsWithChildren<{
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID: string;
  title: string;
  tone?: "neutral" | "lime" | "amber" | "red" | "blue";
}>) {
  const router = useRouter();
  const { palette } = useTheme();

  return (
    <Card
      testID={testID}
      variant={tone === "red" ? "danger" : tone === "amber" ? "warning" : "default"}
      contentStyle={styles.card}
    >
      <View style={styles.header}>
        <IconBubble icon={icon} tone={tone} size={46} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
          <Text style={[styles.body, { color: palette.text.secondary }]}>{body}</Text>
        </View>
      </View>
      {children}
      {ctaHref && ctaLabel ? (
        <ZookButton
          onPress={() => router.push(ctaHref as Href)}
          icon="chevron-forward-outline"
          fullWidth
        >
          {ctaLabel}
        </ZookButton>
      ) : null}
    </Card>
  );
}

export function StreakChip({ value }: { value: number }) {
  const { palette } = useTheme();
  const t = useT();
  return (
    <View
      style={[
        styles.chip,
        { borderColor: palette.accent.soft, backgroundColor: palette.surface.accentSoft },
      ]}
    >
      <Text style={[styles.chipText, { color: palette.accent.base }]}>{t("member.home.dayStreak", { count: value })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: spacing.md,
  },
  copy: { backgroundColor: "transparent", flex: 1, gap: 4 },
  title: { backgroundColor: "transparent", ...typography.headerTitle },
  body: { backgroundColor: "transparent", ...typography.body },
  chip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: typography.caption,
});
