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
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from "@/lib/reanimated-lite";
import { Ionicons } from "@expo/vector-icons";
import {
  GlassCard,
  IconBubble,
  MobileHeader,
  ScannerFrame,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMemberHome, type MemberDashboardData, type MemberHomeData } from "@/lib/domains";
import { getMobileAppEnv } from "@/lib/runtime-mode";
import {
  enqueueAttendanceScan,
  getQueuedAttendanceScans,
  isRetriableAttendanceError,
  removeQueuedAttendanceScan,
} from "@/lib/offline-attendance-queue";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { legacyColors, layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

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

function CameraActiveBottomNavHider() {
  useHideBottomNav();
  return null;
}

function AnimatedLaser() {
  const { palette } = useTheme();
  const translateY = useSharedValue(-120);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(120, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-120, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.scanLineRail,
        { shadowColor: palette.accent.base },
        animatedStyle,
      ]}
    >
      <View style={[styles.scanLineGlow, { backgroundColor: palette.accent.base }]} />
      <View style={[styles.scanLineCore, { backgroundColor: palette.accent.base }]} />
    </Animated.View>
  );
}

export default function Scan() {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const memberHomeQuery = useMemberHome();
  const { permissionState, requestEnablePush } = usePushNotifications();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("scan");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [codePrefix, setCodePrefix] = useState("");
  const [codeDigits, setCodeDigits] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [queuedScanCount, setQueuedScanCount] = useState(0);
  const [replayingQueue, setReplayingQueue] = useState(false);
  const [pendingPushPromptHref, setPendingPushPromptHref] = useState<AttendanceResultHref | null>(
    null,
  );
  const completedRef = useRef(false);
  const pushPromptClosingRef = useRef(false);
  const pushPromptSheetRef = useRef<BottomSheetModal>(null);
  const codeDigitsRef = useRef<TextInput>(null);
  const pushPromptSnapPoints = useMemo(() => ["36%"], []);

  useEffect(() => {
    void getQueuedAttendanceScans().then((queue) => setQueuedScanCount(queue.length));
  }, []);

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
    applyAcceptedAttendance(result, status);
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

  function applyAcceptedAttendance(result: ScanResult, status: string) {
    if (!result.attendance.checkedInAt) {
      return;
    }
    const recentAttendance: MemberHomeData["recentAttendance"][number] = {
      id: result.attendance.id,
      checkedInAt: result.attendance.checkedInAt,
      status,
      source: "MOBILE",
    };
    const mergeHome = (home?: MemberHomeData) => {
      if (!home) {
        return home;
      }
      const existing = home.recentAttendance.filter(
        (attendance) => attendance.id !== recentAttendance.id,
      );
      return {
        ...home,
        recentAttendance: [recentAttendance, ...existing].slice(0, 10),
        streakDays: status === "APPROVED" ? Math.max(home.streakDays ?? 0, 1) : home.streakDays,
      };
    };
    queryClient.setQueryData<MemberHomeData>(["me", "home", activeOrgId], mergeHome);
    queryClient.setQueryData<MemberDashboardData>(
      ["me", "dashboard", activeOrgId ?? null],
      (current) => {
        if (!current) {
          return current;
        }
        return { ...current, home: mergeHome(current.home) ?? current.home };
      },
    );
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

  async function replayQueuedScans() {
    if (!token || replayingQueue) {
      return;
    }
    const queue = await getQueuedAttendanceScans();
    setQueuedScanCount(queue.length);
    if (!queue.length) {
      return;
    }
    setReplayingQueue(true);
    let synced = 0;
    try {
      for (const queuedScan of queue) {
        try {
          const result = await attendanceApi.scan<ScanResult>({
            token,
            body:
              queuedScan.kind === "code"
                ? { checkInCode: queuedScan.payload }
                : { qrPayload: queuedScan.payload },
          });
          synced += 1;
          await removeQueuedAttendanceScan(queuedScan.id);
          const status = result.status ?? result.attendance.status ?? "APPROVED";
          queryClient.setQueryData(["me", "attendance", result.attendance.id], {
            attendance: {
              ...result.attendance,
              status,
              reason: scanReason(result),
            },
          });
        } catch (error) {
          if (isRetriableAttendanceError(error)) {
            break;
          }
          await removeQueuedAttendanceScan(queuedScan.id);
        }
      }
      const nextQueue = await getQueuedAttendanceScans();
      setQueuedScanCount(nextQueue.length);
      if (synced > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        showToast({
          tone: "success",
          haptic: "success",
          message: synced === 1 ? "Saved check-in synced." : `${synced} saved check-ins synced.`,
        });
      }
    } finally {
      setReplayingQueue(false);
    }
  }

  useEffect(() => {
    if (token) {
      void replayQueuedScans();
    }
  }, [token]);

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
      void queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "home"] });
      const nextHref = attendanceResultHref(result, status);
      if (!failed && await maybeShowPushPrompt(nextHref)) {
        return;
      }
      navigateToAttendance(nextHref);
    } catch (error) {
      if (isRetriableAttendanceError(error)) {
        completedRef.current = false;
        const nextQueue = await enqueueAttendanceScan({ payload, kind });
        setQueuedScanCount(nextQueue.length);
        setScanState("failed");
        setErrorMessage(
          "No connection. Your scan is saved to retry, but entry is not confirmed yet.",
        );
        showToast({
          title: "Scan saved for retry",
          message: "Entry is not confirmed until the server accepts it.",
          tone: "amber",
          haptic: "warning",
        });
        return;
      }
      completedRef.current = false;
      setScanState("failed");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function completeDevScan() {
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
      void queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] });
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
      <ZookScreen testID="scan-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            title="Scan Gym QR"
            contextSlot={<RoleSwitcherChip />}
            subtitle="Server-authoritative check-in for your active gym"
            showProfileShortcut={false}
          />

          {cameraBlocked ? (
            <GlassCard variant="danger" contentStyle={styles.blockedPermissionContent}>
              <IconBubble icon="camera-outline" tone="red" size={42} />
              <View style={styles.blockedPermissionCopy}>
                <Text style={[styles.cameraFallbackTitle, { color: palette.text.primary }]}>Camera access blocked</Text>
                <Text style={[styles.cameraFallbackText, { color: palette.text.secondary }]}>
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
              <View style={[styles.cameraCard, { backgroundColor: palette.bg.elevated, borderColor: palette.border.strong }]}>
                {hasCamera ? (
                  <CameraView
                    testID="scanner-view"
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={completedRef.current ? undefined : handleBarcode}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  />
                ) : (
                  <View style={styles.cameraFallback}>
                    <Ionicons name="camera-outline" size={32} color={palette.accent.strong} />
                    <Text style={[styles.cameraFallbackTitle, { color: palette.text.primary }]}>Camera needed</Text>
                    <Text style={[styles.cameraFallbackText, { color: palette.text.secondary, textAlign: "center" }]}>
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
                  <ScannerFrame size={280} tone={scanState === "failed" ? "red" : "lime"}>
                    <AnimatedLaser />
                  </ScannerFrame>
                </View>
                <View style={styles.cameraBadge}>
                  <View style={[styles.liveDot, { backgroundColor: palette.accent.base }]} />
                  <Text style={styles.cameraBadgeText}>
                    {busy ? "Checking code..." : "Searching for code..."}
                  </Text>
                </View>
              </View>

              <GlassCard variant="compact" contentStyle={styles.helpContent}>
                <IconBubble icon="shield-checkmark-outline" tone="neutral" size={36} />
                <View style={styles.helpCopy}>
                  <Text style={[styles.helpTitle, { color: palette.text.primary }]}>Can’t scan?</Text>
                  <Text style={[styles.helpBody, { color: palette.text.secondary }]}>Enter the desk code manually.</Text>
                </View>
                <Pressable
                  testID="scan-manual-code"
                  onPress={() => setScanMode("code")}
                  accessibilityRole="button"
                  accessibilityLabel="Enter manual check-in code"
                  style={styles.manualCodeLink}
                >
                  <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>Enter code</Text>
                  <Ionicons name="chevron-forward" size={16} color={palette.accent.strong} />
                </Pressable>
              </GlassCard>
            </>
          ) : (
            <GlassCard variant="compact" contentStyle={styles.codeContent}>
              <View style={styles.codeHeader}>
                <Text style={[styles.codeTitle, { color: palette.text.primary }]}>Enter check-in code</Text>
                <Text style={[styles.codeHint, { color: palette.text.secondary }]}>Use the two letters and four digits shown with the QR.</Text>
              </View>
              <View style={styles.codeRow}>
                <TextInput
                  testID="scan-code-prefix"
                  value={codePrefix}
                  onChangeText={handlePrefixChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={2}
                  placeholder="AB"
                  placeholderTextColor={mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(17,21,15,0.4)"}
                  style={[styles.codeInput, styles.codePrefixInput, {
                    backgroundColor: palette.bg.sunken,
                    borderColor: palette.border.default,
                    color: palette.text.primary
                  }]}
                  returnKeyType="next"
                  onSubmitEditing={() => codeDigitsRef.current?.focus()}
                />
                <Text style={[styles.codeDivider, { color: palette.text.secondary }]}>-</Text>
                <TextInput
                  testID="scan-code-digits"
                  ref={codeDigitsRef}
                  value={codeDigits}
                  onChangeText={handleDigitsChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="1234"
                  placeholderTextColor={mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(17,21,15,0.4)"}
                  style={[styles.codeInput, styles.codeDigitsInput, {
                    backgroundColor: palette.bg.sunken,
                    borderColor: palette.border.default,
                    color: palette.text.primary
                  }]}
                  returnKeyType="done"
                  onSubmitEditing={submitCode}
                />
                <Pressable
                  testID="scan-submit-code"
                  onPress={submitCode}
                  disabled={busy || !codeReady}
                  accessibilityRole="button"
                  accessibilityLabel="Check code"
                  style={[
                    styles.codeButton,
                    { backgroundColor: palette.accent.base },
                    busy || !codeReady ? styles.codeButtonDisabled : null,
                  ]}
                >
                  <Ionicons name="arrow-forward" size={18} color={palette.text.onAccent} />
                </Pressable>
              </View>
              {busy ? (
                <Text style={[styles.checkingText, { color: palette.text.secondary }]}>
                  <Text style={[styles.checkingDot, { color: palette.accent.base }]}>● </Text>
                  Checking code...
                </Text>
              ) : null}
              <Pressable
                testID="scan-back-to-camera"
                onPress={() => setScanMode("scan")}
                accessibilityRole="button"
                accessibilityLabel="Return to QR scanner"
                style={styles.backToScannerLink}
              >
                <Ionicons name="qr-code-outline" size={15} color={palette.accent.strong} />
                <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>Back to camera scanner</Text>
              </Pressable>
            </GlassCard>
          )}

          <GlassCard variant="compact" contentStyle={styles.validationContent}>
            {["Ready to scan", "Secure QR", "Desk fallback"].map((item) => (
              <View
                key={item}
                style={[
                  styles.validationItem,
                  {
                    backgroundColor: mode === "dark" ? "rgba(185,244,85,0.12)" : "rgba(185,244,85,0.075)",
                    borderColor: mode === "dark" ? "rgba(185,244,85,0.28)" : "rgba(185,244,85,0.18)",
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color={palette.accent.base} />
                <Text style={[styles.validationText, { color: palette.text.primary }]}>{item}</Text>
              </View>
            ))}
          </GlassCard>

          {errorMessage ? (
            <GlassCard variant="warning" contentStyle={styles.errorContent}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={palette.feedback.warning} />
                <Text style={[styles.errorText, { color: palette.text.primary }]}>{errorMessage}</Text>
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

          {queuedScanCount > 0 ? (
            <GlassCard variant="warning" contentStyle={styles.errorContent}>
              <View style={styles.errorRow}>
                <Ionicons name="cloud-upload-outline" size={18} color={palette.feedback.warning} />
                <Text style={[styles.errorText, { color: palette.text.primary }]}>
                  {queuedScanCount} scan{queuedScanCount === 1 ? "" : "s"} waiting for server
                  confirmation.
                </Text>
              </View>
              <ZookButton
                onPress={() => void replayQueuedScans()}
                tone="secondary"
                icon="refresh-outline"
                busy={replayingQueue}
                busyLabel="Syncing"
                style={styles.retryButton}
              >
                Retry now
              </ZookButton>
            </GlassCard>
          ) : null}

          {__DEV__ && getMobileAppEnv() === "local" ? (
            <Pressable
              testID="scan-dev-sample"
              onPress={() => void completeDevScan()}
              accessibilityRole="button"
              accessibilityLabel="Use sample data"
              style={styles.devLink}
            >
              <Text style={[styles.devLinkText, { color: palette.text.secondary }]}>Use sample data</Text>
            </Pressable>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
      <BottomSheetModal
        ref={pushPromptSheetRef}
        snapPoints={pushPromptSnapPoints}
        enablePanDownToClose
        backdropComponent={renderPushPromptBackdrop}
        backgroundStyle={StyleSheet.flatten([
          styles.sheetBackground,
          {
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.subtle,
          },
        ])}
        handleIndicatorStyle={StyleSheet.flatten([
          styles.sheetHandle,
          {
            backgroundColor: palette.border.strong,
          },
        ])}
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
              <Text style={[styles.pushPromptTitle, { color: palette.text.primary }]}>Get plan alerts</Text>
              <Text style={[styles.pushPromptBody, { color: palette.text.secondary }]}>
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
    paddingTop: 20,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 12,
  },
  validationContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: 12,
  },
  validationItem: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.18)",
    backgroundColor: "rgba(185,244,85,0.075)",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  validationText: {
    color: legacyColors.text,
    ...typography.caption,
  },
  cameraCard: {
    minHeight: 430,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: legacyColors.borderStrong,
    backgroundColor: legacyColors.surfaceSolid,
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
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  cameraFallbackText: {
    color: legacyColors.muted,
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
    color: legacyColors.text,
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
    backgroundColor: legacyColors.lime,
  },
  cameraBadgeText: {
    color: legacyColors.text,
    ...typography.caption,
  },
  scanLineRail: {
    width: 238,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: legacyColors.lime,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  scanLineGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 14,
    borderRadius: 999,
    opacity: 0.24,
  },
  scanLineCore: {
    width: "100%",
    height: 3,
    borderRadius: 999,
    opacity: 0.96,
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
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  helpBody: {
    color: legacyColors.muted,
    ...typography.small,
  },
  manualCodeLink: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.24)",
    backgroundColor: "rgba(185,244,85,0.08)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manualCodeLinkText: {
    color: legacyColors.lime,
    ...typography.caption,
  },
  scanHint: {
    color: legacyColors.muted,
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
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  codeHint: {
    color: legacyColors.muted,
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
    borderColor: legacyColors.border,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: legacyColors.text,
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
    color: legacyColors.muted,
    ...typography.cardTitle,
  },
  codeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: legacyColors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  codeButtonDisabled: {
    opacity: 0.45,
  },
  checkingText: {
    color: legacyColors.muted,
    ...typography.small,
  },
  checkingDot: {
    color: legacyColors.lime,
  },
  backToScannerLink: {
    alignSelf: "center",
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  devLink: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  devLinkText: {
    color: legacyColors.muted,
    textDecorationLine: "underline",
    ...typography.caption,
  },
  sheetBackground: {
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
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
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  pushPromptBody: {
    color: legacyColors.muted,
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
