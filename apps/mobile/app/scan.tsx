import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  MobileHeader,
  ScannerFrame,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { attendanceApi } from "@/lib/domain-api";
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
};
type ScanState = "idle" | "checking" | "accepted" | "failed";

export default function Scan() {
  const router = useRouter();
  const { activeOrgId, token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const completedRef = useRef(false);

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
      setScanState(status === "REJECTED" || status === "FLAGGED" ? "failed" : "accepted");
      router.push({
        pathname: "/attendance/[attendanceRecordId]",
        params: {
          attendanceRecordId: result.attendance.id,
          status,
          entryCode: result.attendance.entryCode ?? "",
          branchName: result.attendance.branchName ?? "",
          planName: result.attendance.planName ?? "",
          checkedInAt: result.attendance.checkedInAt ?? "",
          reason: scanReason(result),
        },
      });
    } catch (error) {
      completedRef.current = false;
      setScanState("failed");
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
      setScanState(status === "REJECTED" || status === "FLAGGED" ? "failed" : "accepted");
      router.push({
        pathname: "/attendance/[attendanceRecordId]",
        params: {
          attendanceRecordId: result.attendance.id,
          status,
          entryCode: result.attendance.entryCode ?? "",
          branchName: result.attendance.branchName ?? "",
          planName: result.attendance.planName ?? "",
          checkedInAt: result.attendance.checkedInAt ?? "",
          reason: scanReason(result),
        },
      });
    } catch (error) {
      completedRef.current = false;
      setScanState("failed");
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleBarcode({ data }: BarcodeScanningResult) {
    if (data) {
      void completeScan(data);
      return;
    }
    void completeDevScan();
  }

  function submitCode() {
    const cleanCode = code.trim();
    if (!cleanCode) {
      return;
    }
    void completeScan(cleanCode);
  }

  const hasCamera = permission?.granted;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Check in"
            subtitle="Scan QR or enter code"
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
          />

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
                <Text style={styles.cameraFallbackText}>Allow camera access to scan.</Text>
                <ZookButton
                  onPress={() => void requestPermission()}
                  tone="secondary"
                  style={styles.permissionButton}
                >
                  Allow camera
                </ZookButton>
              </View>
            )}
            <View pointerEvents="none" style={styles.scannerOverlay}>
              <ScannerFrame tone={scanState === "failed" ? "red" : "lime"} />
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="qr-code-outline" size={14} color={colors.lime} />
              <Text style={styles.cameraBadgeText}>Point at desk QR</Text>
            </View>
          </View>

          <View style={styles.validationStrip}>
            <ValidationMini label="Membership" state={scanState} />
            <ValidationMini label="Gym" state={scanState} />
            <ValidationMini label="Check in" state={scanState} />
          </View>

          <GlassCard variant="compact" contentStyle={styles.codeContent}>
            <View style={styles.codeHeader}>
              <Text style={styles.codeTitle}>Can’t scan?</Text>
              <Text style={styles.codeHint}>Enter code</Text>
            </View>
            <View style={styles.codeRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder="Paste QR code"
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
                style={[styles.codeButton, busy || !code.trim() ? styles.codeButtonDisabled : null]}
              >
                <Ionicons name="arrow-forward" size={18} color={colors.bg} />
              </Pressable>
            </View>
          </GlassCard>

          {errorMessage ? (
            <GlassCard variant="warning" contentStyle={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.amber} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </GlassCard>
          ) : null}

          {__DEV__ ? (
            <Pressable
              onPress={() => void completeDevScan()}
              accessibilityRole="button"
              accessibilityLabel="Demo scan"
              style={styles.devButton}
            >
              <Ionicons name="bug-outline" size={16} color={colors.amber} />
              <Text style={styles.devButtonText}>Demo scan (dev only)</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function ValidationMini({ label, state }: { label: string; state: ScanState }) {
  const icon = state === "failed" ? "close-circle" : "checkmark-circle";
  const color = state === "failed" ? colors.red : colors.lime;
  return (
    <View style={styles.validationMini}>
      {state === "checking" || state === "idle" ? (
        <ActivityIndicator size="small" color={colors.lime} />
      ) : (
        <Ionicons name={icon} size={15} color={color} />
      )}
      <Text numberOfLines={1} style={styles.validationMiniText}>
        {label}
      </Text>
    </View>
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
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.text,
    ...typography.small,
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
  cameraBadgeText: {
    color: colors.text,
    ...typography.caption,
  },
  validationStrip: {
    flexDirection: "row",
    gap: 8,
  },
  validationMini: {
    flex: 1,
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
  },
  validationMiniText: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: "700",
  },
  codeContent: {
    padding: 12,
    gap: spacing.sm,
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
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
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.3)",
    backgroundColor: "rgba(242,201,76,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  devButtonText: {
    color: colors.amber,
    ...typography.caption,
  },
});
