import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, ZookButton } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export function HomeActionStrip({
  daysLeftLabel,
  expired,
  lastCheckIn,
  planName,
  streakDays,
}: {
  daysLeftLabel: string;
  expired: boolean;
  lastCheckIn: string;
  planName: string;
  streakDays: number;
}) {
  const { mode, palette } = useTheme();
  const isDark = mode === "dark";
  const accentColor = expired ? palette.feedback.warning : palette.accent.base;
  const tileSurface = isDark ? palette.bg.sunken : palette.surface.raised;
  return (
    <GlassCard
      variant={expired ? "warning" : "selected"}
      glow={!expired}
      contentStyle={styles.content}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.statusTile,
            {
              borderColor: expired ? palette.feedback.warning : palette.border.subtle,
              backgroundColor: tileSurface,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.statusValue, { color: palette.text.primary }]}>
            {expired ? "Renew" : daysLeftLabel}
          </Text>
          <Text numberOfLines={1} style={[styles.statusLabel, { color: palette.text.secondary }]}>
            {planName}
          </Text>
        </View>
        <ZookButton
          href={expired ? "/membership" : "/scan"}
          icon={expired ? "refresh-outline" : "qr-code-outline"}
          variant="secondary"
          style={styles.scanButton}
          textStyle={[styles.scanButtonText, { color: accentColor }]}
          accessibilityLabel={expired ? "Renew membership" : "Scan gym QR"}
        >
          {expired ? "Renew" : "Scan QR"}
        </ZookButton>
      </View>
      <View style={styles.streakRow}>
        <View
          style={[
            styles.streakIcon,
            {
              backgroundColor: expired ? palette.surface.warningSoft : palette.surface.accentSoft,
            },
          ]}
        >
          <Ionicons name="flame-outline" size={15} color={accentColor} />
        </View>
        <Text numberOfLines={1} style={[styles.streakText, { color: palette.text.secondary }]}>
          {streakDays}-day streak · Last: {lastCheckIn}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
  },
  statusTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 4,
  },
  statusValue: {
    ...typography.h2,
  },
  statusLabel: {
    ...typography.small,
  },
  scanButton: {
    flex: 1,
    minHeight: 86,
  },
  scanButtonText: {
  },
  streakRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  streakIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  streakText: {
    flex: 1,
    ...typography.small,
  },
});
