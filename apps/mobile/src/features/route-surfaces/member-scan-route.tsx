import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AccessibilityInfo,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
} from "react-native";
import {
  HeaderActions,
  ScreenHeader,
  useRequestPermissionWithRationale,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { attendanceApi } from "@/lib/domain-api";
import { usePushNotifications } from "@/lib/push-notifications";
import { useMemberHome, type MemberDashboardData, type MemberHomeData } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { getMobileAppEnv, isMobileFeatureEnabled } from "@/lib/runtime-mode";
import {
  enqueueAttendanceScan,
  getQueuedAttendanceScans,
  isRetriableAttendanceError,
  removeQueuedAttendanceScan,
} from "@/lib/offline-attendance-queue";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import {
  ScanVerificationCard,
  type ScanVerificationStep,
} from "@/features/member/scan/scan-verification-card";
import { ManualCodeCard } from "@/features/member/scan/manual-code-card";
import { CameraScanSection } from "@/features/member/scan/camera-scan-section";
import { CameraBlockedCard } from "@/features/member/scan/camera-blocked-card";
import { QueuedScanWarningCard, ScanErrorCard } from "@/features/member/scan/scan-warning-cards";
import { CheckInMoment } from "@/features/member/scan/check-in-moment";
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

const ATTENDANCE_DEVICE_ID_STORAGE_KEY = "zook_attendance_device_id";
const SCAN_CONFIRMATION_VISIBLE_MS = 420;
const CHECK_IN_MOMENT_VISIBLE_MS = 1400;

function CameraActiveBottomNavHider() {
  useHideBottomNav();
  return null;
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
  const t = useT();
  const isDark = mode === "dark";
  const showDevTestScan =
    __DEV__ && getMobileAppEnv() === "local" && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const codePlaceholderColor = palette.text.tertiary;
  const cameraBadgeSurface = isDark ? palette.bg.elevated : palette.surface.raised;
  const router = useRouter();
  const autoScanParams = useLocalSearchParams<{ autoQrPayload?: string; autoCheckInCode?: string }>();
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
  const autoSubmittedRef = useRef(false);
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

  const scanReason = useCallback((result: ScanResult) => {
    if (Array.isArray(result.suspiciousFlags) && result.suspiciousFlags.length) {
      return result.suspiciousFlags.join(", ");
    }
    if (result.duplicate) {
      return t("member.scan.alreadyCheckedInToday");
    }
    return result.attendance.reason ?? "";
  }, [t]);

  function scanWarnings(result: ScanResult) {
    if (!Array.isArray(result.warnings)) {
      return "";
    }
    return result.warnings
      .map((warning) =>
        warning === "profile_photo_recommended"
          ? t("member.scan.profilePhotoRecommended")
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
          message: t(synced === 1 ? "member.scan.savedCheckInConfirmed" : "member.scan.savedCheckInsConfirmed", { count: synced }),
        });
      }
    } finally {
      setReplayingQueue(false);
    }
  }, [deviceId, queryClient, replayingQueue, scanReason, t, token]);

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
      ? t("member.scan.cameraBlockedAnnouncement")
      : hasCamera
        ? t("member.scan.cameraAvailableAnnouncement")
        : t("member.scan.cameraNeededAnnouncement");
    AccessibilityInfo.announceForAccessibility(message);
  }, [cameraBlocked, hasCamera, scanMode, t]);
  const needsProfilePhoto = /profile photo/i.test(errorMessage);
  const codeReady = codePrefix.length === 2 && codeDigits.length === 4;

  const verificationSteps = useMemo<ScanVerificationStep[]>(() => {
    const captureComplete = scanMode === "code" ? codeReady : hasCamera;
    return [
      {
        key: "capture",
        label:
          scanMode === "code"
            ? codeReady
              ? t("member.scan.codeEntered")
              : t("member.scan.enterCode")
            : hasCamera
              ? t("member.scan.cameraAvailable")
              : t("member.scan.cameraNeeded"),
        state: captureComplete ? "complete" : "idle",
      },
      {
        key: "decode",
        label:
          scanState === "idle"
            ? scanMode === "code"
              ? t("member.scan.awaitingSubmit")
              : t("member.scan.awaitingQr")
            : t("member.scan.codeCaptured"),
        state: scanState === "idle" ? "idle" : scanState === "failed" ? "failed" : "complete",
      },
      {
        key: "server",
        label:
          scanState === "accepted"
            ? t("member.scan.serverVerified")
            : scanState === "failed"
              ? t("member.scan.notVerified")
              : scanState === "checking"
                ? t("member.scan.verifying")
                : t("member.scan.serverCheck"),
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
  }, [codeReady, hasCamera, scanMode, scanState, t]);

  useFocusEffect(
    useCallback(() => {
      resetScan();
    }, []),
  );

  // Auto-submit when the screen is reached from a check-in deep link (native
  // camera scans the gym QR -> universal link -> /checkin -> here). Runs once.
  useEffect(() => {
    if (autoSubmittedRef.current || !token) {
      return;
    }
    const qrPayload = autoScanParams.autoQrPayload;
    const checkInCode = autoScanParams.autoCheckInCode;
    if (qrPayload) {
      autoSubmittedRef.current = true;
      void completeScan(String(qrPayload), "qr");
    } else if (checkInCode) {
      const normalized = normalizeCheckInCode(String(checkInCode)) || String(checkInCode);
      autoSubmittedRef.current = true;
      void completeScan(normalized, "code");
    }
    // completeScan is a stable closure for this purpose; the ref guard prevents re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScanParams.autoQrPayload, autoScanParams.autoCheckInCode, token]);

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
        throw new Error(t("member.scan.signInAgain"));
      }
      const activeMembership = memberHomeQuery.data?.activeMembership;
      const membershipExpired =
        Boolean(activeMembership) &&
        (String(activeMembership?.status ?? "")
          .toUpperCase()
          .includes("EXPIRED") ||
          (typeof activeMembership?.daysLeft === "number" && activeMembership.daysLeft <= 0));
      if (membershipExpired && !memberHomeQuery.isFetching) {
        throw new Error(t("member.scan.membershipExpired"));
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
              t("member.scan.yourGym"),
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
          t("member.scan.offlineSavedBody"),
        );
        showToast({
          title: t("member.scan.offlineSavedTitle"),
          message: t("member.scan.offlineSavedToast"),
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
        throw new Error(t("member.scan.signInSelectGym"));
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
      setErrorMessage(t("member.scan.couldNotReadQr"));
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
          <ScreenHeader
            title={t("member.scan.title")}
            contextSlot={<RoleSwitcherChip />}
            trailing={<HeaderActions showBell />}
          />

          {cameraBlocked ? (
            <CameraBlockedCard
              cameraPermissionBusy={cameraPermission.busy}
              palette={palette}
              t={t}
              onRequestCamera={() => void cameraPermission.requestPermission()}
              onSwitchToCode={() => setScanMode("code")}
            />
          ) : null}

          {scanMode === "scan" ? (
            <CameraScanSection
              busy={busy}
              cameraBadgeSurface={cameraBadgeSurface}
              cameraBlocked={Boolean(cameraBlocked)}
              cameraPermissionBusy={cameraPermission.busy}
              completed={completedRef.current}
              hasCamera={hasCamera}
              scanState={scanState}
              t={t}
              onBarcodeScanned={handleBarcode}
              onOpenSettings={() => void Linking.openSettings()}
              onRequestCamera={() => void cameraPermission.requestPermission()}
              onSwitchToCode={() => setScanMode("code")}
            />
          ) : (
            <ManualCodeCard
              busy={busy}
              codeDigits={codeDigits}
              codeDigitsRef={codeDigitsRef}
              codePlaceholderColor={codePlaceholderColor}
              codePrefix={codePrefix}
              codePrefixRef={codePrefixRef}
              codeReady={codeReady}
              t={t}
              onBackToScanner={() => setScanMode("scan")}
              onDigitsChange={handleDigitsChange}
              onPrefixChange={handlePrefixChange}
              onSubmitCode={submitCode}
            />
          )}

          {scanState !== "idle" ? (
            <ScanVerificationCard steps={verificationSteps} />
          ) : null}

          <ScanErrorCard
            errorMessage={errorMessage}
            needsProfilePhoto={needsProfilePhoto}
            t={t}
            onAddPhoto={() => router.push("/profile" as never)}
            onResetScan={resetScan}
          />

          <QueuedScanWarningCard
            queuedScanCount={queuedScanCount}
            replayingQueue={replayingQueue}
            t={t}
            onReplayQueuedScans={() => void replayQueuedScans()}
          />

          {showDevTestScan ? (
            <Pressable
              testID="scan-dev-test"
              onPress={() => void completeDevScan()}
              accessibilityRole="button"
              accessibilityLabel={t("member.scan.tryCheckIn")}
              style={styles.devLink}
            >
              <Text style={[styles.devLinkText, { color: palette.text.secondary }]}>
                {t("member.scan.tryCheckIn")}
              </Text>
            </Pressable>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
      {cameraPermission.permissionSheet}
      {notificationPermission.permissionSheet}
      <CheckInMoment
        visible={Boolean(checkInMoment)}
        gymName={checkInMoment?.gymName ?? t("member.scan.yourGym")}
        onDone={() => setCheckInMoment(null)}
      />
    </>
  );
}
