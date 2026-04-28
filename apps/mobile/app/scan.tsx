import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookMockServices } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  ScannerFrame,
  ZookButton,
  ZookChip,
  ZookScreen,
} from "@/components/primitives";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Result = Awaited<ReturnType<typeof zookMockServices.attendanceService.scanQr>>;

export default function Scan() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function simulateScan() {
    setBusy(true);
    try {
      const result: Result = await zookMockServices.attendanceService.scanQr("zook-demo-approved");
      router.push({
        pathname: "/attendance/[attendanceRecordId]",
        params: {
          attendanceRecordId: result.id,
          status: result.status,
          entryCode: result.entryCode,
          branchName: result.branchName,
          planName: result.planName,
          checkedInAt: result.checkedInAt,
          reason: result.reason,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Scan Gym QR"
            subtitle="Iron Temple Gym"
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
          />

          <Pressable
            onPress={() => void simulateScan()}
            accessibilityRole="button"
            accessibilityLabel="Scan the gym QR"
            style={styles.scannerStage}
          >
            <ScannerFrame>
              <Ionicons name="qr-code-outline" size={72} color="rgba(185,244,85,0.52)" />
              <Text style={styles.scannerText}>{busy ? "Validating..." : "Tap to simulate scan"}</Text>
            </ScannerFrame>
          </Pressable>

          <View style={styles.helperRow}>
            <Ionicons name="qr-code-outline" size={16} color={colors.lime} />
            <Text style={styles.helperText}>Scan the rolling QR at the reception desk.</Text>
          </View>

          <GlassCard contentStyle={styles.validationContent}>
            <ValidationRow title="Membership active" icon="shield-checkmark-outline" />
            <View style={styles.divider} />
            <ValidationRow title="Branch verified" icon="checkmark-circle-outline" />
            <View style={styles.divider} />
            <ValidationRow title="Server-authorized check-in" icon="lock-closed-outline" />
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.supportContent}>
            <ListRow
              title="Can’t scan? Enter code"
              leading={<IconBubble icon="headset-outline" tone="neutral" size={34} />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              style={styles.flatRow}
            />
            <View style={styles.divider} />
            <View style={styles.modeRow}>
              <View style={styles.modeCopy}>
                <Ionicons name="qr-code-outline" size={15} color={colors.lime} />
                <Text style={styles.modeLabel}>Attendance mode</Text>
              </View>
              <ZookChip tone="lime" icon="checkmark">
                Auto
              </ZookChip>
            </View>
          </GlassCard>

          <ZookButton onPress={() => void simulateScan()} disabled={busy} icon="scan-outline">
            {busy ? "Validating" : "Simulate Scan"}
          </ZookButton>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function ValidationRow({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.validationRow}>
      <View style={styles.validationCopy}>
        <IconBubble icon={icon} tone="neutral" size={32} />
        <Text style={styles.validationTitle}>{title}</Text>
      </View>
      <Ionicons name="checkmark" size={16} color={colors.lime} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: 128,
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerStage: {
    height: 292,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  scannerText: {
    color: colors.muted,
    ...typography.small,
  },
  helperRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  helperText: {
    color: colors.muted,
    ...typography.small,
  },
  validationContent: {
    padding: 10,
    gap: 0,
  },
  validationRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  validationCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  validationTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  supportContent: {
    padding: 10,
    gap: spacing.sm,
  },
  flatRow: {
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modeRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  modeCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modeLabel: {
    color: colors.muted,
    ...typography.small,
  },
});
