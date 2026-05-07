import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  ScannerFrame,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { attendanceApi } from "@/lib/domain-api";
import { usePushNotifications } from "@/lib/push-notifications";
import { getMobileAppEnv } from "@/lib/runtime-mode";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ScanResult = {
  attendance: {
    id: string;
    status?: string | null;
    checkedInAt?: string | null;
    branchName?: string | null;
    planName?: string | null;
    entryCode?: string | null;
    reason?: string | null;
  };
  status?: string | null;
  duplicate?: boolean;
  suspiciousFlags?: unknown;
  warnings?: unknown;
};
type ScanState = "idle" | "checking" | "accepted" | "failed";
type ScanMode = "scan" | "code";
type AttendanceResultHref = {
  pathname: "/attendance/[attendanceRecordId]";
  params: {
    attendanceRecordId: string;
  };
};

const PUSH_PROMPTED_STORAGE_KEY = "zook_push_prompted";

const scanModeOptions: Array<{ label: string; value: ScanMode }> = [
  { label: "Scan QR", value: "scan" },
  { label: "Enter code", value: "code" },
];

function CameraActiveBottomNavHider() {
  useHideBottomNav();
  return null;
}

export default function Scan() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { permissionState, requestEnablePush } = usePushNotifications();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("scan");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPushPromptHref, setPendingPushPromptHref] = useState<AttendanceResultHref | null>(
    null,
  );
  const completedRef = useRef(false);
  const pushPromptClosingRef = useRef(false);
  const pushPromptSheetRef = useRef<BottomSheetModal>(null);
  const pushPromptSnapPoints = useMemo(() => ["36%"], []);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  function scanReason(result: ScanResult) {
    if (Array.isArray(result.suspiciousFlags) && result.suspiciousFlags.length) {
      return result.suspiciousFlags.join(", ");
    }
    if (result.duplicate) {
      return "Already checked in today.";
    }
    return result.attendance.reason ?? "";
  }

  function scanWarnings(result: ScanResult) {
    if (!Array.isArray(result.warnings)) {
      return "";
    }
    return result.warnings
      .map((warning) =>
        warning === "profile_photo_recommended"
          ? "Add a profile photo after check-in so the desk can verify you faster next time."
          : String(warning),
      )
      .join(" ");
  }

  function attendanceResultHref(result: ScanResult, status: string): AttendanceResultHref {
    queryClient.setQueryData(["me", "attendance", result.attendance.id], {
      attendance: {
        ...result.attendance,
        status,
        reason: scanReason(result),
      },
    });
    queryClient.setQueryData(["me", "attendanceWarning", result.attendance.id], scanWarnings(result));
    return {
      pathname: "/attendance/[attendanceRecordId]",
      params: {
        attendanceRecordId: result.attendance.id,
      },
    };
  }

  function navigateToAttendance(href: AttendanceResultHref) {
    router.push(href as never);
  }

  async function maybeShowPushPrompt(href: AttendanceResultHref) {
    if (Platform.OS === "web" || permissionState === "granted") {
      return false;
    }
    const prompted = await getStoredValue(PUSH_PROMPTED_STORAGE_KEY);
    if (prompted) {
      return false;
    }
    await setStoredValue(PUSH_PROMPTED_STORAGE_KEY, "1");
    setPendingPushPromptHref(href);
    setTimeout(() => pushPromptSheetRef.current?.present(), 0);
    return true;
  }

  async function closePushPrompt(enable: boolean) {
    const href = pendingPushPromptHref;
    pushPromptClosingRef.current = true;
    setPendingPushPromptHref(null);
    pushPromptSheetRef.current?.dismiss();
    if (enable) {
      await requestEnablePush();
    }
    if (href) {
      navigateToAttendance(href);
    }
  }

  const renderPushPromptBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  async function completeScan(payload: string) {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    setBusy(true);
    setScanState("checking");
    setErrorMessage("");
    try {
      if (!token) {
        throw new Error("Sign in again before scanning.");
      }
      const result = await attendanceApi.scan<ScanResult>({
        token,
        body: { qrPayload: payload },
      });
      const status = result.status ?? result.attendance.status ?? "APPROVED";
      const failed = status === "REJECTED" || status === "FLAGGED";
      setScanState(failed ? "failed" : "accepted");
      void Haptics.notificationAsync(
        failed
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
      void queryClient.invalidateQueries({ queryKey: ["me", "attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "home"] });
      const nextHref = attendanceResultHref(result, status);
      if (!failed && await maybeShowPushPrompt(nextHref)) {
        return;
      }
      navigateToAttendance(nextHref);
    } catch (error) {
      completedRef.current = false;
      setScanState("failed");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function completeDevScan() {
    if (isOfflineDemoMode()) {
      await completeScan("zook://qr/org-iron-temple/branch-default/demo-approved");
      return;
    }
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    setBusy(true);
    setScanState("checking");
    setErrorMessage("");
    try {
      if (!token || !activeOrgId) {
        throw new Error("Sign in and select a gym before scanning.");
      }
      const result = await attendanceApi.devScan<ScanResult>({
        token,
        orgId: activeOrgId,
      });
      const status = result.status ?? result.attendance.status ?? "APPROVED";
      const failed = status === "REJECTED" || status === "FLAGGED";
      setScanState(failed ? "failed" : "accepted");
      void Haptics.notificationAsync(
        failed
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
      void queryClient.invalidateQueries({ queryKey: ["me", "attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "home"] });
      navigateToAttendance(attendanceResultHref(result, status));
    } catch (error) {
      completedRef.current = false;
      setScanState("failed");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleBarcode({ data }: BarcodeScanningResult) {
    if (!data || data.trim() === "") {
      setErrorMessage("Could not read QR code. Try again.");
      setScanState("failed");
      return;
    }
    void completeScan(data);
  }

  function submitCode() {
    const cleanCode = code.trim();
    if (!cleanCode) {
      return;
    }
    void Haptics.selectionAsync();
    void completeScan(cleanCode);
  }

  function resetScan() {
    completedRef.current = false;
    setBusy(false);
    setScanState("idle");
    setErrorMessage("");
    setCode("");
  }

  const hasCamera = permission?.granted;
  const cameraBlocked = permission && !permission.granted && permission.canAskAgain === false;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {scanMode === "scan" ? <CameraActiveBottomNavHider /> : null}
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            title="Check in"
            subtitle="Scan QR or enter code"
            showProfileShortcut={false}
          />

          <SegmentedControl options={scanModeOptions} value={scanMode} onChange={setScanMode} />

          {cameraBlocked ? (
            <GlassCard variant="danger" contentStyle={styles.blockedPermissionContent}>
              <IconBubble icon="camera-outline" tone="red" size={42} />
              <View style={styles.blockedPermissionCopy}>
                <Text style={styles.cameraFallbackTitle}>Camera access blocked</Text>
                <Text style={styles.cameraFallbackText}>
                  Allow camera access in Settings to scan QR codes.
                </Text>
              </View>
              <ZookButton
                onPress={() => void Linking.openSettings()}
                tone="secondary"
                icon="settings-outline"
              >
                Open settings
              </ZookButton>
            </GlassCard>
          ) : null}

          {scanMode === "scan" ? (
            <>
              <View style={styles.cameraCard}>
                {hasCamera ? (
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={completedRef.current ? undefined : handleBarcode}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  />
                ) : (
                  <View style={styles.cameraFallback}>
                    <Ionicons name="camera-outline" size={32} color={colors.lime} />
                    <Text style={styles.cameraFallbackTitle}>Camera needed</Text>
                    <Text style={styles.cameraFallbackText}>
                      {cameraBlocked
                        ? "Camera access is blocked. Open device settings to allow scanning."
                        : "Allow camera access to scan the gym QR."}
                    </Text>
                    <ZookButton
                      onPress={() =>
                        cameraBlocked ? void Linking.openSettings() : void requestPermission()
                      }
                      tone="secondary"
                      style={styles.permissionButton}
                    >
                      {cameraBlocked ? "Open settings" : "Allow camera"}
                    </ZookButton>
                  </View>
                )}
                <View pointerEvents="none" style={styles.scannerOverlay}>
                  <ScannerFrame tone={scanState === "failed" ? "red" : "lime"}>
                    <View style={styles.scanLine} />
                  </ScannerFrame>
                </View>
                <View style={styles.cameraBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.cameraBadgeText}>
                    {busy ? "Checking code..." : "Searching for code..."}
                  </Text>
                </View>
              </View>

              <GlassCard variant="compact" contentStyle={styles.helpContent}>
                <IconBubble icon="shield-checkmark-outline" tone="neutral" size={36} />
                <View style={styles.helpCopy}>
                  <Text style={styles.helpTitle}>Camera not working?</Text>
                  <Text style={styles.helpBody}>Switch to Enter code or ask the desk for help.</Text>
                </View>
                <Pressable
                  onPress={() => setScanMode("code")}
                  accessibilityRole="button"
                  accessibilityLabel="Enter code instead"
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              </GlassCard>
            </>
          ) : (
            <GlassCard variant="compact" contentStyle={styles.codeContent}>
              <View style={styles.codeHeader}>
                <Text style={styles.codeTitle}>Enter desk code</Text>
                <Text style={styles.codeHint}>Use the code shown at the gym desk.</Text>
              </View>
              <View style={styles.codeRow}>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  placeholder="Desk code"
                  placeholderTextColor={colors.subtle}
                  style={styles.codeInput}
                  returnKeyType="done"
                  onSubmitEditing={submitCode}
                />
                <Pressable
                  onPress={submitCode}
                  disabled={busy || !code.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Check code"
                  style={[
                    styles.codeButton,
                    busy || !code.trim() ? styles.codeButtonDisabled : null,
                  ]}
                >
                  <Ionicons name="arrow-forward" size={18} color={colors.bg} />
                </Pressable>
              </View>
              {busy ? (
                <Text style={styles.checkingText}>
                  <Text style={styles.checkingDot}>● </Text>
                  Checking code...
                </Text>
              ) : null}
            </GlassCard>
          )}

          {errorMessage ? (
            <GlassCard variant="warning" contentStyle={styles.errorContent}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.amber} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              <ZookButton
                onPress={resetScan}
                tone="secondary"
                icon="refresh-outline"
                style={styles.retryButton}
              >
                Scan again
              </ZookButton>
            </GlassCard>
          ) : null}

          {__DEV__ && getMobileAppEnv() === "local" ? (
            <Pressable
              onPress={() => void completeDevScan()}
              accessibilityRole="button"
              accessibilityLabel="Use sample data"
              style={styles.devLink}
            >
              <Text style={styles.devLinkText}>Use sample data</Text>
            </Pressable>
          ) : null}
        </KeyboardAwareScreen>
        <BottomNav />
      </ZookScreen>
      <BottomSheetModal
        ref={pushPromptSheetRef}
        snapPoints={pushPromptSnapPoints}
        enablePanDownToClose
        backdropComponent={renderPushPromptBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        onDismiss={() => {
          if (pushPromptClosingRef.current) {
            pushPromptClosingRef.current = false;
            return;
          }
          if (pendingPushPromptHref) {
            const href = pendingPushPromptHref;
            setPendingPushPromptHref(null);
            navigateToAttendance(href);
          }
        }}
      >
        <BottomSheetView style={styles.pushPromptSheet}>
          <View style={styles.pushPromptHeader}>
            <IconBubble icon="barbell-outline" tone="lime" size={42} />
            <View style={styles.pushPromptCopy}>
              <Text style={styles.pushPromptTitle}>Get plan alerts</Text>
              <Text style={styles.pushPromptBody}>
                Get notified when your trainer publishes a new plan.
              </Text>
            </View>
          </View>
          <View style={styles.pushPromptActions}>
            <ZookButton
              onPress={() => void closePushPrompt(true)}
              icon="notifications-outline"
              style={styles.pushPromptAction}
            >
              Enable
            </ZookButton>
            <ZookButton
              onPress={() => void closePushPrompt(false)}
              tone="secondary"
              style={styles.pushPromptAction}
            >
              Not now
            </ZookButton>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 10,
  },
  cameraCard: {
    height: 304,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSolid,
  },
  camera: {
    flex: 1,
  },
  cameraFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cameraFallbackTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  cameraFallbackText: {
    color: colors.muted,
    ...typography.small,
  },
  permissionButton: {
    minHeight: 38,
    marginTop: spacing.xs,
  },
  blockedPermissionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  blockedPermissionCopy: {
    flex: 1,
    gap: 4,
  },
  errorContent: {
    gap: spacing.sm,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.text,
    ...typography.small,
  },
  retryButton: {
    minHeight: 40,
  },
  scannerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: "rgba(7,9,8,0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  cameraBadgeText: {
    color: colors.text,
    ...typography.caption,
  },
  scanLine: {
    width: 190,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.lime,
    opacity: 0.72,
    shadowColor: colors.lime,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  helpContent: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  helpCopy: {
    flex: 1,
    gap: 3,
  },
  helpTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  helpBody: {
    color: colors.muted,
    ...typography.small,
  },
  scanHint: {
    color: colors.muted,
    textAlign: "center",
    ...typography.small,
  },
  codeContent: {
    padding: 12,
    gap: spacing.sm,
  },
  codeHeader: {
    gap: 4,
  },
  codeTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  codeHint: {
    color: colors.muted,
    ...typography.small,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: colors.text,
    paddingHorizontal: 12,
    ...typography.bodyStrong,
  },
  codeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  codeButtonDisabled: {
    opacity: 0.45,
  },
  checkingText: {
    color: colors.muted,
    ...typography.small,
  },
  checkingDot: {
    color: colors.lime,
  },
  devLink: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  devLinkText: {
    color: colors.muted,
    textDecorationLine: "underline",
    ...typography.caption,
  },
  sheetBackground: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  sheetHandle: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  pushPromptSheet: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  pushPromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pushPromptCopy: {
    flex: 1,
    gap: 5,
  },
  pushPromptTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  pushPromptBody: {
    color: colors.muted,
    ...typography.body,
  },
  pushPromptActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pushPromptAction: {
    flex: 1,
  },
});
