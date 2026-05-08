import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
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
  ChipGroup,
  GlassCard,
  IconBubble,
  MobileHeader,
  ScannerFrame,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { attendanceApi } from "@/lib/domain-api";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMemberHome } from "@/lib/query-hooks";
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

const scanModeOptions: Array<{ label: string; value: ScanMode; icon: "qr-code-outline" | "keypad-outline" }> = [
  { label: "Scan QR", value: "scan", icon: "qr-code-outline" },
  { label: "Enter code", value: "code", icon: "keypad-outline" },
];

function CameraActiveBottomNavHider() {
  useHideBottomNav();
  return null;
}

export default function Scan() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const memberHomeQuery = useMemberHome();
  const { permissionState, requestEnablePush } = usePushNotifications();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("scan");
  const [modeLocked, setModeLocked] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [codePrefix, setCodePrefix] = useState("");
  const [codeDigits, setCodeDigits] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPushPromptHref, setPendingPushPromptHref] = useState<AttendanceResultHref | null>(
    null,
  );
  const completedRef = useRef(false);
  const pushPromptClosingRef = useRef(false);
  const pushPromptSheetRef = useRef<BottomSheetModal>(null);
  const codeDigitsRef = useRef<TextInput>(null);
  const pushPromptSnapPoints = useMemo(() => ["36%"], []);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (scanMode !== "scan" || scanState !== "failed" || !errorMessage) {
      return undefined;
    }
    const timer = setTimeout(() => {
      completedRef.current = false;
      setScanState("idle");
    }, 3000);
    return () => clearTimeout(timer);
  }, [errorMessage, scanMode, scanState]);

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

  async function completeScan(payload: string, kind: "qr" | "code" = "qr") {
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
      const activeMembership = memberHomeQuery.data?.activeMembership;
      const membershipExpired =
        Boolean(activeMembership) &&
        (String(activeMembership?.status ?? "")
          .toUpperCase()
          .includes("EXPIRED") ||
          (typeof activeMembership?.daysLeft === "number" && activeMembership.daysLeft <= 0));
      if (membershipExpired) {
        throw new Error("Membership expired. Renew before checking in.");
      }
      const result = await attendanceApi.scan<ScanResult>({
        token,
        body: kind === "code" ? { checkInCode: payload } : { qrPayload: payload },
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
      completedRef.current = false;
      setErrorMessage("Could not read QR code. Try again.");
      setScanState("failed");
      return;
    }
    void completeScan(data);
  }

  function submitCode() {
    const formattedCode = `${codePrefix}-${codeDigits}`;
    if (codePrefix.length !== 2 || codeDigits.length !== 4) {
      return;
    }
    void Haptics.selectionAsync();
    void completeScan(formattedCode, "code");
  }

  function handlePrefixChange(value: string) {
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const letters = compact.replace(/[^A-Z]/g, "").slice(0, 2);
    const digits = compact.replace(/[^0-9]/g, "").slice(0, 4);
    setCodePrefix(letters);
    if (digits) {
      setCodeDigits((current) => `${digits}${current}`.slice(0, 4));
    }
    if (letters.length === 2) {
      codeDigitsRef.current?.focus();
    }
  }

  function handleDigitsChange(value: string) {
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const pastedMatch = /^([A-Z]{2})([0-9]{1,4})$/.exec(compact);
    if (pastedMatch) {
      setCodePrefix(pastedMatch[1] ?? "");
      setCodeDigits(pastedMatch[2] ?? "");
      return;
    }
    setCodeDigits(compact.replace(/[^0-9]/g, "").slice(0, 4));
  }

  function handleModeChange(nextMode: ScanMode) {
    if (modeLocked || busy || nextMode === scanMode) return;
    setModeLocked(true);
    setScanMode(nextMode);
    setTimeout(() => setModeLocked(false), 200);
  }

  function resetScan() {
    completedRef.current = false;
    setBusy(false);
    setScanState("idle");
    setErrorMessage("");
    setCodePrefix("");
    setCodeDigits("");
  }

  const hasCamera = permission?.granted;
  const cameraBlocked = permission && !permission.granted && permission.canAskAgain === false;
  const needsProfilePhoto = /profile photo/i.test(errorMessage);
  const codeReady = codePrefix.length === 2 && codeDigits.length === 4;

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

          <ChipGroup
            accessibilityLabel="Check-in method"
            disabled={busy || modeLocked}
            options={scanModeOptions}
            value={scanMode}
            onChange={handleModeChange}
          />

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
                <Text style={styles.codeTitle}>Enter check-in code</Text>
                <Text style={styles.codeHint}>Use the two letters and four digits shown with the QR.</Text>
              </View>
              <View style={styles.codeRow}>
                <TextInput
                  value={codePrefix}
                  onChangeText={handlePrefixChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={2}
                  placeholder="AB"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={[styles.codeInput, styles.codePrefixInput]}
                  returnKeyType="next"
                  onSubmitEditing={() => codeDigitsRef.current?.focus()}
                />
                <Text style={styles.codeDivider}>-</Text>
                <TextInput
                  ref={codeDigitsRef}
                  value={codeDigits}
                  onChangeText={handleDigitsChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="1234"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={[styles.codeInput, styles.codeDigitsInput]}
                  returnKeyType="done"
                  onSubmitEditing={submitCode}
                />
                <Pressable
                  onPress={submitCode}
                  disabled={busy || !codeReady}
                  accessibilityRole="button"
                  accessibilityLabel="Check code"
                  style={[
                    styles.codeButton,
                    busy || !codeReady ? styles.codeButtonDisabled : null,
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
                onPress={() => {
                  if (needsProfilePhoto) {
                    router.push("/profile" as never);
                    return;
                  }
                  resetScan();
                }}
                tone="secondary"
                icon={needsProfilePhoto ? "person-circle-outline" : "refresh-outline"}
                style={styles.retryButton}
              >
                {needsProfilePhoto ? "Add photo" : "Scan again"}
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
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: colors.text,
    paddingHorizontal: 12,
    textAlign: "center",
    ...typography.bodyStrong,
  },
  codePrefixInput: {
    width: 74,
    letterSpacing: 1.4,
  },
  codeDigitsInput: {
    flex: 1,
    letterSpacing: 2,
  },
  codeDivider: {
    color: colors.muted,
    ...typography.cardTitle,
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
