import { Stack, useFocusEffect, useRouter } from "expo-router";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AccessibilityInfo,
  Linking,
  Animated as RNAnimated,
  Easing as RNEasing,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  EmptyState,
  IconBubble,
  AppHeader,
  type PillTone,
  ProfileShortcut,
  ScannerFrame,
  useRequestPermissionWithRationale,
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
import { getMobileAppEnv, isMobileFeatureEnabled } from "@/lib/runtime-mode";
import {
  enqueueAttendanceScan,
  getQueuedAttendanceScans,
  isRetriableAttendanceError,
  removeQueuedAttendanceScan,
} from "@/lib/offline-attendance-queue";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { elevation, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { scanStyles as styles } from "./member-scan-route.styles";

type ScanResult = {
  attendance: {
    id: string;
    status?: string | null;
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    checkoutReason?: string | null;
    durationSeconds?: number | null;
    branchName?: string | null;
    planName?: string | null;
    entryCode?: string | null;
    reason?: string | null;
  };
  status?: string | null;
  action?: "checkin" | "checkout" | "already_checked_out" | string | null;
  checkedOut?: boolean;
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

function toneForScanState(state: ScanState): PillTone {
  if (state === "accepted") return "lime";
  if (state === "checking") return "amber";
  if (state === "failed") return "red";
  return "neutral";
}

const ATTENDANCE_DEVICE_ID_STORAGE_KEY = "zook_attendance_device_id";
const SCAN_CONFIRMATION_VISIBLE_MS = 420;
const CHECK_IN_MOMENT_VISIBLE_MS = 1400;

type VerificationStep = {
  key: "capture" | "decode" | "server";
  label: string;
  state: "idle" | "active" | "complete" | "failed";
};

function CameraActiveBottomNavHider() {
  useHideBottomNav();
  return null;
}

function AnimatedLaser({ frameSize = 280 }: { frameSize?: number }) {
  const { palette } = useTheme();
  const progress = useRef(new RNAnimated.Value(0)).current;
  // Sweep edge-to-edge within the frame with a small inset so the line never
  // clips the corner brackets. Derived from the real frame size instead of a
  // magic constant so it always spans the full scan window.
  const travel = Math.max(40, frameSize / 2 - 20);

  useEffect(() => {
    // Smooth ping-pong sweep (down then back up). The previous version snapped
    // the line from the bottom back to the top with a zero-duration reset,
    // which read as a glitchy teleport rather than a continuous scan.
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(progress, {
          toValue: 1,
          duration: 1500,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(progress, {
          toValue: 0,
          duration: 1500,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const animatedStyle = {
    opacity: progress.interpolate({
      // Fade slightly at the turn-around points so the reversal feels soft.
      inputRange: [0, 0.08, 0.92, 1],
      outputRange: [0.35, 1, 1, 0.35],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-travel, travel],
        }),
      },
    ],
  };

  return (
    <RNAnimated.View
      style={[
        styles.scanLineRail,
        animatedStyle,
      ]}
    >
      <View style={[styles.scanLineCore, { backgroundColor: palette.accent.base }]} />
    </RNAnimated.View>
  );
}

function createAttendanceDeviceId() {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getAttendanceDeviceId() {
  const existing = await getStoredValue(ATTENDANCE_DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const next = createAttendanceDeviceId();
  await setStoredValue(ATTENDANCE_DEVICE_ID_STORAGE_KEY, next);
  return next;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactCheckInCodeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeCheckInCode(value: string) {
  const compact = compactCheckInCodeInput(value);
  const match = /^([A-Z]{2})([0-9]{4})$/.exec(compact);
  return match ? `${match[1]}-${match[2]}` : "";
}

function readScannedAttendancePayload(
  data: string,
): { kind: "qr" | "code"; payload: string } | null {
  const trimmed = data.trim();
  if (!trimmed) {
    return null;
  }
  const directCode = normalizeCheckInCode(trimmed);
  if (directCode) {
    return { kind: "code", payload: directCode };
  }
  try {
    const parsed = new URL(trimmed);
    const qrPayload =
      parsed.searchParams.get("qrPayload") ??
      parsed.searchParams.get("payload") ??
      parsed.searchParams.get("attendanceQr");
    if (qrPayload) {
      return { kind: "qr", payload: qrPayload };
    }
    const checkInCode =
      parsed.searchParams.get("checkInCode") ??
      parsed.searchParams.get("code") ??
      normalizeCheckInCode(parsed.pathname);
    if (checkInCode) {
      return { kind: "code", payload: checkInCode };
    }
  } catch {
    // Raw signed QR payloads are expected, so non-URL values continue below.
  }
  return { kind: "qr", payload: trimmed };
}

export default function Scan() {
  const { mode, palette } = useTheme();
  const isDark = mode === "dark";
  const showDevTestScan =
    __DEV__ && getMobileAppEnv() === "local" && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const codePlaceholderColor = palette.text.tertiary;
  const cameraBadgeSurface = isDark ? palette.bg.elevated : palette.surface.raised;
  const getVerificationItemStyle = (state: VerificationStep["state"]) => {
    if (state === "failed") {
      return {
        backgroundColor: palette.surface.dangerSoft,
        borderColor: palette.feedback.danger,
      };
    }
    if (state === "active") {
      return {
        backgroundColor: isDark ? palette.surface.raised : palette.bg.sunken,
        borderColor: palette.feedback.info,
      };
    }
    if (state === "complete") {
      return {
        backgroundColor: palette.surface.successSoft,
        borderColor: palette.feedback.success,
      };
    }
    return {
      backgroundColor: palette.surface.default,
      borderColor: palette.border.subtle,
    };
  };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const memberHomeQuery = useMemberHome();
  const onRefresh = useCallback(async () => {
    await memberHomeQuery.refetch();
  }, [memberHomeQuery]);
  const { permissionState, requestEnablePush } = usePushNotifications();
  const cameraPermission = useRequestPermissionWithRationale("camera");
  const notificationPermission = useRequestPermissionWithRationale("notifications");
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("scan");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [checkInMoment, setCheckInMoment] = useState<{ gymName: string } | null>(null);
  const [codePrefix, setCodePrefix] = useState("");
  const [codeDigits, setCodeDigits] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [queuedScanCount, setQueuedScanCount] = useState(0);
  const [replayingQueue, setReplayingQueue] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const completedRef = useRef(false);
  const codePrefixRef = useRef<TextInput>(null);
  const codeDigitsRef = useRef<TextInput>(null);

  useEffect(() => {
    void getQueuedAttendanceScans().then((queue) => setQueuedScanCount(queue.length));
  }, []);

  useEffect(() => {
    if (scanMode === "code") {
      const timer = setTimeout(() => {
        codePrefixRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [scanMode]);

  useEffect(() => {
    let mounted = true;
    void getAttendanceDeviceId().then((value) => {
      if (mounted) {
        setDeviceId(value);
      }
    });
    return () => {
      mounted = false;
    };
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
    queryClient.setQueryData(
      ["me", "attendanceWarning", result.attendance.id],
      scanWarnings(result),
    );
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
      checkedOutAt: result.attendance.checkedOutAt,
      checkoutReason: result.attendance.checkoutReason,
      durationSeconds: result.attendance.durationSeconds,
      status,
      source: "MOBILE",
    };
    const checkedOut = result.checkedOut || result.action === "checkout";
    const mergeHome = (home?: MemberHomeData) => {
      if (!home) {
        return home;
      }
      const existing = home.recentAttendance.filter(
        (attendance) => attendance.id !== recentAttendance.id,
      );
      return {
        ...home,
        activeCheckIn: checkedOut
          ? home.activeCheckIn?.id === recentAttendance.id
            ? null
            : home.activeCheckIn
          : {
              id: result.attendance.id,
              checkedInAt: result.attendance.checkedInAt ?? recentAttendance.checkedInAt,
              checkedOutAt: result.attendance.checkedOutAt,
              checkoutReason: result.attendance.checkoutReason,
              durationSeconds: result.attendance.durationSeconds,
              status,
              source: "MOBILE",
              branchName: result.attendance.branchName,
            },
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

  async function maybeShowPushPrompt() {
    if (Platform.OS === "web" || permissionState === "granted") {
      return false;
    }
    const granted = await notificationPermission.requestPermission();
    if (granted) {
      await requestEnablePush();
    }
    return false;
  }

  const replayQueuedScans = useCallback(async () => {
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
                ? { checkInCode: queuedScan.payload, deviceId: queuedScan.deviceId ?? deviceId }
                : { qrPayload: queuedScan.payload, deviceId: queuedScan.deviceId ?? deviceId },
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
  }, [deviceId, queryClient, replayingQueue, token]);

  useEffect(() => {
    if (token) {
      void replayQueuedScans();
    }
  }, [replayQueuedScans, token]);

  const hasCamera = cameraPermission.status?.granted;
  const cameraBlocked =
    cameraPermission.status && !cameraPermission.status.granted && cameraPermission.status.canAskAgain === false;

  useEffect(() => {
    if (scanMode !== "scan") return;
    const message = cameraBlocked
      ? "Camera access blocked. Open device settings to allow QR scanning."
      : hasCamera
        ? "Camera ready. Point the camera at your gym QR code."
        : "Camera permission needed before scanning.";
    AccessibilityInfo.announceForAccessibility(message);
  }, [cameraBlocked, hasCamera, scanMode]);
  const needsProfilePhoto = /profile photo/i.test(errorMessage);
  const codeReady = codePrefix.length === 2 && codeDigits.length === 4;

  const verificationSteps = useMemo<VerificationStep[]>(() => {
    const captureComplete = scanMode === "code" ? codeReady : hasCamera;
    return [
      {
        key: "capture",
        label:
          scanMode === "code"
            ? codeReady
              ? "Code ready"
              : "Enter code"
            : hasCamera
              ? "Camera ready"
              : "Camera needed",
        state: captureComplete ? "complete" : "idle",
      },
      {
        key: "decode",
        label:
          scanState === "idle"
            ? scanMode === "code"
              ? "Awaiting submit"
              : "Awaiting QR"
            : "Code captured",
        state: scanState === "idle" ? "idle" : scanState === "failed" ? "failed" : "complete",
      },
      {
        key: "server",
        label:
          scanState === "accepted"
            ? "Server verified"
            : scanState === "failed"
              ? "Not verified"
              : scanState === "checking"
                ? "Verifying"
                : "Server check",
        state:
          scanState === "accepted"
            ? "complete"
            : scanState === "failed"
              ? "failed"
              : scanState === "checking"
                ? "active"
                : "idle",
      },
    ];
  }, [codeReady, hasCamera, scanMode, scanState]);

  useFocusEffect(
    useCallback(() => {
      resetScan();
    }, []),
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
      if (membershipExpired && !memberHomeQuery.isFetching) {
        throw new Error("Membership expired. Renew before checking in.");
      }
      const result = await attendanceApi.scan<ScanResult>({
        token,
        body:
          kind === "code" ? { checkInCode: payload, deviceId } : { qrPayload: payload, deviceId },
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
      if (!failed) {
        const action = String(result.action ?? "").toLowerCase();
        const isCheckIn = action !== "checkout" && action !== "already_checked_out" && !result.checkedOut;
        if (isCheckIn) {
          setCheckInMoment({
            gymName:
              result.attendance.branchName ??
              memberHomeQuery.data?.activeOrganization?.name ??
              "Your gym",
          });
          await sleep(CHECK_IN_MOMENT_VISIBLE_MS);
          setCheckInMoment(null);
        } else {
          await sleep(SCAN_CONFIRMATION_VISIBLE_MS);
        }
      }
      if (!failed) {
        await maybeShowPushPrompt();
      }
      navigateToAttendance(nextHref);
    } catch (error) {
      if (isRetriableAttendanceError(error)) {
        completedRef.current = false;
        const nextQueue = await enqueueAttendanceScan({ payload, kind, deviceId });
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
      if (kind === "code") {
        setTimeout(() => {
          setCodePrefix("");
          setCodeDigits("");
          codePrefixRef.current?.focus();
        }, 1800);
      }
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
      setTimeout(() => {
        setCodePrefix("");
        setCodeDigits("");
        codePrefixRef.current?.focus();
      }, 1800);
    } finally {
      setBusy(false);
    }
  }

  function handleBarcode({ data }: BarcodeScanningResult) {
    const scanned = readScannedAttendancePayload(data ?? "");
    if (!scanned) {
      completedRef.current = false;
      setErrorMessage("Could not read QR code. Try again.");
      setScanState("failed");
      return;
    }
    void Haptics.selectionAsync();
    void completeScan(scanned.payload, scanned.kind);
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
    const compact = compactCheckInCodeInput(value);
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
    const compact = compactCheckInCodeInput(value);
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
            refreshControl: (
              <RefreshControl
                refreshing={memberHomeQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <AppHeader
            title="Scan to check in"
            contextSlot={<RoleSwitcherChip />}
            subtitle="Point your camera at the QR code at your gym"
            showBack
            onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            trailing={<ProfileShortcut />}
            showProfileShortcut={false}
          />

          {cameraBlocked ? (
            <Card variant="danger" contentStyle={styles.blockedPermissionContent}>
              <IconBubble icon="camera-outline" tone="red" size={42} />
              <View style={styles.blockedPermissionCopy}>
                <Text style={[styles.cameraFallbackTitle, { color: palette.text.primary }]}>
                  Camera access blocked
                </Text>
                <Text style={[styles.cameraFallbackText, { color: palette.text.secondary }]}>
                  Allow camera access in Settings to scan QR codes.
                </Text>
              </View>
              <ZookButton
                onPress={() => void Linking.openSettings()}
                variant="secondary"
                icon="settings-outline"
              >
                Open settings
              </ZookButton>
              <View style={styles.permissionRecoveryRow}>
                <ZookButton
                  onPress={() => setScanMode("code")}
                  variant="secondary"
                  icon="keypad-outline"
                  style={styles.permissionRecoveryAction}
                >
                  Enter code manually
                </ZookButton>
                <ZookButton
                  onPress={() => void cameraPermission.requestPermission()}
                  disabled={cameraPermission.busy}
                  busy={cameraPermission.busy}
                  variant="secondary"
                  icon="refresh-outline"
                  style={styles.permissionRecoveryAction}
                >
                  Try camera again
                </ZookButton>
              </View>
            </Card>
          ) : null}

          {scanMode === "scan" ? (
            <>
              <View
                style={[
                  styles.cameraCard,
                  { backgroundColor: palette.bg.elevated, borderColor: palette.border.strong },
                ]}
              >
                {hasCamera ? (
                  <CameraView
                    testID="scanner-view"
                    accessibilityLabel="QR scanner camera preview"
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={completedRef.current ? undefined : handleBarcode}
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  />
                ) : (
                  <View style={styles.cameraFallback}>
                    <EmptyState
                      icon="camera-outline"
                      title={cameraBlocked ? "Camera access blocked" : "Enable camera"}
                      body={
                        cameraBlocked
                          ? "Open device settings to allow QR scanning."
                          : "Allow camera access when you are ready to scan the gym QR."
                      }
                    />
                    <ZookButton
                      onPress={() => {
                        if (cameraBlocked) {
                          void Linking.openSettings();
                          return;
                        }
                        void cameraPermission.requestPermission();
                      }}
                      disabled={cameraPermission.busy}
                      busy={cameraPermission.busy}
                      variant="secondary"
                      style={styles.permissionButton}
                    >
                      {cameraBlocked ? "Open settings" : "Allow camera"}
                    </ZookButton>
                  </View>
                )}
                <View pointerEvents="none" style={styles.scannerOverlay}>
                  <ScannerFrame size={280} tone={toneForScanState(scanState)}>
                    <AnimatedLaser frameSize={280} />
                  </ScannerFrame>
                </View>
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: cameraBadgeSurface,
                      borderColor: palette.border.default,
                    },
                  ]}
                >
                  <View style={[styles.liveDot, { backgroundColor: palette.accent.base }]} />
                  <Text style={[styles.cameraBadgeText, { color: palette.text.primary }]}>
                    {busy ? "Checking code..." : "Searching for code..."}
                  </Text>
                </View>
              </View>

              <Card variant="compact" contentStyle={styles.helpContent}>
                <IconBubble icon="shield-checkmark-outline" tone="neutral" size={36} />
                <View style={styles.helpCopy}>
                  <Text style={[styles.helpTitle, { color: palette.text.primary }]}>
                    Can’t scan?
                  </Text>
                  <Text style={[styles.helpBody, { color: palette.text.secondary }]}>
                    Enter the desk code manually.
                  </Text>
                </View>
                <Pressable
                  testID="scan-manual-code"
                  onPress={() => setScanMode("code")}
                  accessibilityRole="button"
                  accessibilityLabel="Enter manual check-in code"
                  style={({ pressed }) => [styles.manualCodeLink, pressed ? styles.linkPressed : null]}
                >
                  <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>
                    Enter code
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={palette.accent.strong} />
                </Pressable>
              </Card>
            </>
          ) : (
            <Card variant="compact" contentStyle={styles.codeContent}>
              <View style={styles.codeHeader}>
                <Text style={[styles.codeTitle, { color: palette.text.primary }]}>
                  Enter check-in code
                </Text>
                <Text style={[styles.codeHint, { color: palette.text.secondary }]}>
                  Use the two letters and four digits shown with the QR.
                </Text>
              </View>
              <View style={styles.codeRow}>
                <TextInput
                  testID="scan-code-prefix"
                  ref={codePrefixRef}
                  value={codePrefix}
                  onChangeText={handlePrefixChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={2}
                  placeholder="AB"
                  placeholderTextColor={codePlaceholderColor}
                  style={[
                    styles.codeInput,
                    styles.codePrefixInput,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.default,
                      color: palette.text.primary,
                    },
                  ]}
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
                  placeholderTextColor={codePlaceholderColor}
                  style={[
                    styles.codeInput,
                    styles.codeDigitsInput,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.default,
                      color: palette.text.primary,
                    },
                  ]}
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
              {!codeReady && (codePrefix.length > 0 || codeDigits.length > 0) ? (
                <Text style={[styles.codeValidationHint, { color: palette.text.secondary }]}>
                  {codePrefix.length < 2
                    ? "Need 2 letters (e.g. AB)"
                    : "Need 4 numbers (e.g. 1234)"}
                </Text>
              ) : null}
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
                style={({ pressed }) => [styles.backToScannerLink, pressed ? styles.linkPressed : null]}
              >
                <Ionicons name="qr-code-outline" size={15} color={palette.accent.strong} />
                <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>
                  Back to camera scanner
                </Text>
              </Pressable>
            </Card>
          )}

          {scanState !== "idle" || cameraBlocked || (scanMode === "scan" && !hasCamera) ? (
          <Card variant="compact" contentStyle={styles.validationContent}>
            {verificationSteps.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.validationItem,
                  getVerificationItemStyle(item.state),
                ]}
              >
                <Ionicons
                  name={
                    item.state === "failed"
                      ? "close-circle-outline"
                      : item.state === "active"
                        ? "radio-button-on"
                        : item.state === "complete"
                          ? "checkmark-circle"
                          : "ellipse-outline"
                  }
                  size={15}
                  color={
                    item.state === "failed"
                      ? palette.feedback.danger
                      : item.state === "active"
                        ? palette.feedback.info
                        : item.state === "complete"
                          ? palette.accent.base
                          : palette.text.secondary
                  }
                />
                <Text style={[styles.validationText, { color: palette.text.primary }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </Card>
          ) : null}

          {errorMessage ? (
            <Card variant="warning" contentStyle={styles.errorContent}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={palette.feedback.warning} />
                <Text style={[styles.errorText, { color: palette.text.primary }]}>
                  {errorMessage}
                </Text>
              </View>
              <ZookButton
                onPress={() => {
                  if (needsProfilePhoto) {
                    router.push("/profile" as never);
                    return;
                  }
                  resetScan();
                }}
                variant="secondary"
                icon={needsProfilePhoto ? "person-circle-outline" : "refresh-outline"}
                style={styles.retryButton}
              >
                {needsProfilePhoto ? "Add photo" : "Scan again"}
              </ZookButton>
            </Card>
          ) : null}

          {queuedScanCount > 0 ? (
            <Card variant="warning" contentStyle={styles.errorContent}>
              <View style={styles.errorRow}>
                <Ionicons name="cloud-upload-outline" size={18} color={palette.feedback.warning} />
                <Text style={[styles.errorText, { color: palette.text.primary }]}>
                  {queuedScanCount} scan{queuedScanCount === 1 ? "" : "s"} waiting for server
                  confirmation.
                </Text>
              </View>
              <ZookButton
                onPress={() => void replayQueuedScans()}
                variant="secondary"
                icon="refresh-outline"
                busy={replayingQueue}
                busyLabel="Syncing"
                style={styles.retryButton}
              >
                Retry now
              </ZookButton>
            </Card>
          ) : null}

          {showDevTestScan ? (
            <Pressable
              testID="scan-dev-test"
              onPress={() => void completeDevScan()}
              accessibilityRole="button"
              accessibilityLabel="Use test check-in"
              style={styles.devLink}
            >
              <Text style={[styles.devLinkText, { color: palette.text.secondary }]}>
                Use test check-in
              </Text>
            </Pressable>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
      {cameraPermission.permissionSheet}
      {notificationPermission.permissionSheet}
      <CheckInMoment
        visible={Boolean(checkInMoment)}
        gymName={checkInMoment?.gymName ?? "Your gym"}
        onDone={() => setCheckInMoment(null)}
      />
    </>
  );
}

function CheckInMoment({
  visible,
  gymName,
  onDone,
}: {
  visible: boolean;
  gymName: string;
  onDone: () => void;
}) {
  const { palette } = useTheme();
  const scale = useRef(new RNAnimated.Value(0.82)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.82);
      opacity.setValue(0);
      return;
    }
    RNAnimated.parallel([
      RNAnimated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(onDone, CHECK_IN_MOMENT_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onDone, opacity, scale, visible]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onDone}>
      <View style={[styles.checkInMomentBackdrop, { backgroundColor: palette.bg.overlay }]}>
        <RNAnimated.View style={[styles.checkInMomentContent, { opacity, transform: [{ scale }] }]}>
          <View
            style={[
              styles.checkInMomentTick,
              { backgroundColor: palette.accent.base },
              Platform.OS === "android"
                ? elevation(6, palette.accent.base, {
                    elevation: 6,
                    shadowOpacity: 0.24,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 8 },
                  })
                : {
                    shadowColor: palette.accent.base,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.28,
                    shadowRadius: 24,
                  },
            ]}
          >
            <Ionicons name="checkmark" size={58} color={palette.text.onAccent} />
          </View>
          <Text style={[styles.checkInMomentGym, { color: palette.text.secondary }]} numberOfLines={1}>
            {gymName}
          </Text>
          <Text style={[styles.checkInMomentTitle, { color: palette.text.primary }]}>Checked in</Text>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}
