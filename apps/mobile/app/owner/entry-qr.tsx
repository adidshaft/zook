import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  AppHeader,
  Card,
  IconBubble,
  Pill,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAttendanceQrToken } from "@/lib/domains/owner/queries";
import { toWebUrl } from "@/lib/api";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

const QR_PAPER = "#FFFFFF";
const QR_INK = "#11150F";

function secondsUntil(expiresAt?: string) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function OwnerEntryQr() {
  const { palette, mode } = useTheme();
  const tokenQuery = useAttendanceQrToken();
  const token = tokenQuery.data;
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setRemaining(secondsUntil(token?.expiresAt));
    const timer = setInterval(() => setRemaining(secondsUntil(token?.expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [token?.expiresAt]);

  // Encode the same universal link the web console uses, so a member's native
  // camera bridges straight into the app (-> /checkin -> auto check-in).
  const qrValue = token?.qrPayload
    ? toWebUrl(
        `/checkin?qrPayload=${encodeURIComponent(token.qrPayload)}${
          token.checkInCode ? `&checkInCode=${encodeURIComponent(token.checkInCode)}` : ""
        }`,
      )
    : "";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-entry-qr-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AppHeader
            title="Entry QR"
            subtitle="Display this at your entrance. Members scan it to check in."
            showProfileShortcut={false}
            showBack
          />

          {tokenQuery.isError ? (
            <QueryErrorState error={tokenQuery.error} onRetry={() => void tokenQuery.refetch()} />
          ) : null}

          <Card contentStyle={styles.qrCard}>
            <View style={styles.qrPaper}>
              {qrValue ? (
                <QRCode value={qrValue} size={232} backgroundColor={QR_PAPER} color={QR_INK} />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={{ color: QR_INK, ...typography.small }}>
                    {tokenQuery.isLoading ? "Loading QR…" : "No QR"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.codeBlock}>
              <Text style={[styles.codeLabel, { color: palette.text.secondary }]}>Manual check-in code</Text>
              <Text style={[styles.code, { color: palette.accent.base }]}>{token?.checkInCode ?? "—— ————"}</Text>
            </View>

            <View style={styles.refreshRow}>
              <Pill tone={remaining > 5 ? "lime" : "amber"}>
                {remaining > 0 ? `Refreshes in ${remaining}s` : "Refreshing…"}
              </Pill>
              <ZookButton size="sm" variant="secondary" icon="refresh-outline" onPress={() => void tokenQuery.refetch()}>
                Refresh now
              </ZookButton>
            </View>
          </Card>

          <Card variant="compact" contentStyle={styles.infoRow}>
            <IconBubble icon="shield-checkmark-outline" tone="lime" size={38} />
            <View style={styles.infoCopy}>
              <Text style={[styles.infoTitle, { color: palette.text.primary }]}>Secure rolling token</Text>
              <Text style={[styles.infoBody, { color: palette.text.secondary }]}>
                The code rotates automatically and is single-use. Members can scan the QR with their
                phone camera or type the code in the Zook app.
              </Text>
            </View>
          </Card>

          <Card variant="compact" contentStyle={styles.infoRow}>
            <IconBubble icon="business-outline" tone="blue" size={38} />
            <View style={styles.infoCopy}>
              <Text style={[styles.infoTitle, { color: palette.text.primary }]}>Branch-aware</Text>
              <Text style={[styles.infoBody, { color: palette.text.secondary }]}>
                This QR is tied to your active branch. Only members with a valid membership at this
                gym can check in — others are turned away automatically.
              </Text>
            </View>
          </Card>
          {/* keep mode referenced for theme-driven contrast tweaks */}
          {mode === "dark" ? null : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  qrCard: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.lg },
  qrPaper: {
    alignItems: "center",
    backgroundColor: QR_PAPER,
    borderRadius: radii.card,
    justifyContent: "center",
    padding: spacing.lg,
  },
  qrPlaceholder: { alignItems: "center", height: 232, justifyContent: "center", width: 232 },
  codeBlock: { alignItems: "center", gap: 4 },
  codeLabel: { ...typography.caption },
  code: { ...typography.display, fontSize: 40, letterSpacing: 4 },
  refreshRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  infoRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  infoCopy: { flex: 1, gap: 2, minWidth: 0 },
  infoTitle: { ...typography.cardTitle },
  infoBody: { ...typography.small },
});
