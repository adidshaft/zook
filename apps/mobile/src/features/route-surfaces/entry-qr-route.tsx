import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  BranchSelectorChip,
  Card,
  HeaderActions,
  IconBubble,
  Pill,
  QueryErrorState,
  ScreenHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useAttendanceQrToken } from "@/lib/domains/owner/queries";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { fixedSurfaces, layout, radii, spacing, typography, useTheme } from "@/lib/theme";

const QR_PAPER = fixedSurfaces.qrPaper;
const QR_INK = fixedSurfaces.qrInk;

function secondsUntil(expiresAt?: string) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function EntryQrRoute() {
  const { palette, mode } = useTheme();
  const { t } = useI18n();
  const { activeOrgId, token: authToken } = useAuth();
  const tokenQuery = useAttendanceQrToken();
  const token = tokenQuery.data;
  const [remaining, setRemaining] = useState(0);
  const isStatic = Boolean(token?.isStatic || token?.qrMode === "STATIC");

  useEffect(() => {
    setRemaining(secondsUntil(token?.expiresAt));
    const timer = setInterval(() => setRemaining(secondsUntil(token?.expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [token?.expiresAt]);

  async function updateQrMode(qrMode: "ROLLING" | "STATIC") {
    if (!activeOrgId || !authToken || !token?.branchId) return;
    await mobileApiFetch(`/orgs/${activeOrgId}/branches/${token.branchId}/qr-settings`, {
      method: "PATCH",
      token: authToken,
      orgId: activeOrgId,
      body: { qrMode, staticQrExpiryDays: qrMode === "STATIC" ? 30 : undefined },
    });
    await tokenQuery.refetch();
  }

  async function regenerateQr() {
    if (!activeOrgId || !authToken) return;
    const branchQuery = token?.branchId ? `?branchId=${encodeURIComponent(token.branchId)}` : "";
    await mobileApiFetch(`/orgs/${activeOrgId}/attendance/qr-token/regenerate${branchQuery}`, {
      method: "POST",
      token: authToken,
      orgId: activeOrgId,
      body: {},
    });
    await tokenQuery.refetch();
  }

  async function openPrintView() {
    const branchQuery = token?.branchId ? `?branchId=${encodeURIComponent(token.branchId)}` : "";
    await Linking.openURL(toWebUrl(`/dashboard/attendance/qr-display${branchQuery}`));
  }

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
          <ScreenHeader
            title={t("entryQr.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip variant="header" style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
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
                    {tokenQuery.isLoading ? t("entryQr.loadingQr") : t("entryQr.noQr")}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.codeBlock}>
              <Text style={[styles.codeLabel, { color: palette.text.secondary }]}>
                {t("entryQr.manualCode")}
              </Text>
              <Text style={[styles.code, { color: palette.accent.base }]}>
                {token?.checkInCode ?? "—— ————"}
              </Text>
            </View>

            <View style={styles.refreshRow}>
              <Pill tone={isStatic || remaining > 5 ? "lime" : "amber"}>
                {isStatic
                  ? `Valid until ${token?.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : "--"}`
                  : remaining > 0
                    ? t("entryQr.refreshesIn", { seconds: remaining })
                    : t("entryQr.refreshing")}
              </Pill>
              {!isStatic ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("entryQr.refreshNow")}
                  hitSlop={8}
                  onPress={() => void tokenQuery.refetch()}
                  style={({ pressed }) => [
                    styles.iconAction,
                    {
                      borderColor: palette.border.default,
                      backgroundColor: palette.surface.default,
                    },
                    pressed ? styles.iconActionPressed : null,
                  ]}
                >
                  <IconBubble icon="refresh-outline" tone="neutral" size={30} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.refreshRow}>
              <ZookButton
                size="sm"
                variant={isStatic ? "secondary" : "primary"}
                onPress={() => void updateQrMode("ROLLING")}
              >
                {t("entryQr.rollingMode")}
              </ZookButton>
              <ZookButton
                size="sm"
                variant={isStatic ? "primary" : "secondary"}
                onPress={() => void updateQrMode("STATIC")}
              >
                {t("entryQr.staticMode")}
              </ZookButton>
              {isStatic ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("entryQr.print")}
                    hitSlop={8}
                    onPress={() => void openPrintView()}
                    style={({ pressed }) => [
                      styles.iconAction,
                      {
                        borderColor: palette.border.default,
                        backgroundColor: palette.surface.default,
                      },
                      pressed ? styles.iconActionPressed : null,
                    ]}
                  >
                    <IconBubble icon="print-outline" tone="neutral" size={30} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("entryQr.regenerate")}
                    hitSlop={8}
                    onPress={() => void regenerateQr()}
                    style={({ pressed }) => [
                      styles.iconAction,
                      {
                        borderColor: palette.border.default,
                        backgroundColor: palette.surface.default,
                      },
                      pressed ? styles.iconActionPressed : null,
                    ]}
                  >
                    <IconBubble icon="refresh-outline" tone="neutral" size={30} />
                  </Pressable>
                </>
              ) : null}
            </View>
          </Card>

          <Card variant="compact" contentStyle={styles.infoRail}>
            <View style={styles.infoRow}>
              <IconBubble icon="shield-checkmark-outline" tone="lime" size={34} />
              <View style={styles.infoCopy}>
                <Text style={[styles.infoTitle, { color: palette.text.primary }]}>
                  {t("entryQr.secureToken")}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.infoBody, { color: palette.text.secondary }]}
                >
                  {t("entryQr.secureTokenBody")}
                </Text>
              </View>
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
  headerContext: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 240,
    minWidth: 0,
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 190,
  },
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
  code: { ...typography.timer, letterSpacing: 4 },
  refreshRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  iconAction: {
    alignItems: "center",
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconActionPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  infoRail: { gap: spacing.sm },
  infoRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  infoCopy: { flex: 1, gap: 2, minWidth: 0 },
  infoTitle: { ...typography.cardTitle },
  infoBody: { ...typography.small },
});
