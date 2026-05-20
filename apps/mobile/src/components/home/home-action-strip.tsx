import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, ZookButton } from "@/components/primitives";
import { legacyColors, spacing, typography } from "@/lib/theme";

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
  return (
    <GlassCard
      variant={expired ? "warning" : "selected"}
      glow={!expired}
      contentStyle={styles.content}
    >
      <View style={styles.topRow}>
        <View style={styles.statusTile}>
          <Text numberOfLines={1} style={styles.statusValue}>
            {expired ? "Renew" : daysLeftLabel}
          </Text>
          <Text numberOfLines={1} style={styles.statusLabel}>
            {planName}
          </Text>
        </View>
        <ZookButton
          href={expired ? "/membership" : "/scan"}
          icon={expired ? "refresh-outline" : "qr-code-outline"}
          tone="secondary"
          style={styles.scanButton}
          textStyle={styles.scanButtonText}
          accessibilityLabel={expired ? "Renew membership" : "Scan gym QR"}
        >
          {expired ? "Renew" : "Scan QR"}
        </ZookButton>
      </View>
      <View style={styles.streakRow}>
        <Ionicons name="flame-outline" size={17} color={legacyColors.lime} />
        <Text numberOfLines={1} style={styles.streakText}>
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
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 4,
  },
  statusValue: {
    color: legacyColors.text,
    ...typography.h2,
  },
  statusLabel: {
    color: legacyColors.muted,
    ...typography.small,
  },
  scanButton: {
    flex: 1,
    minHeight: 86,
  },
  scanButtonText: {
    color: legacyColors.lime,
  },
  streakRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  streakText: {
    flex: 1,
    color: legacyColors.muted,
    ...typography.small,
  },
});
