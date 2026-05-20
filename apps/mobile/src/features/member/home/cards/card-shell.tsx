import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard, IconBubble, ZookButton } from "@/components/primitives";
import { legacyColors, spacing, typography } from "@/lib/theme";

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
  return (
    <GlassCard testID={testID} variant="selected" glow contentStyle={styles.card}>
      <View style={styles.header}>
        <IconBubble icon={icon} tone={tone} size={46} />
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </View>
      {children}
      {ctaHref && ctaLabel ? (
        <ZookButton href={ctaHref as never} icon="chevron-forward-outline" fullWidth>
          {ctaLabel}
        </ZookButton>
      ) : null}
    </GlassCard>
  );
}

export function StreakChip({ value }: { value: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{value} day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  copy: { flex: 1, gap: 4 },
  title: { color: legacyColors.text, ...typography.title },
  body: { color: legacyColors.muted, ...typography.body },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(188,255,0,0.10)",
    borderColor: "rgba(188,255,0,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: legacyColors.lime, ...typography.caption },
});
