import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookMockServices } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  MobileHeader,
  ScannerFrame,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Result = Awaited<ReturnType<typeof zookMockServices.attendanceService.scanQr>>;
type ScanState = "idle" | "checking" | "accepted" | "failed";

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [code, setCode] = useState("");
  const completedRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    autoTimerRef.current = setTimeout(() => {
      void completeScan("zook-demo-approved");
    }, 5000);

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
      }
    };
  }, []);

  async function completeScan(payload: string) {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
    }
    setBusy(true);
    setScanState("checking");
    try {
      const result: Result = await zookMockServices.attendanceService.scanQr(payload);
      setScanState(result.status === "REJECTED" || result.status === "FLAGGED" ? "failed" : "accepted");
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
    } catch {
      completedRef.current = false;
      setScanState("failed");
    } finally {
      setBusy(false);
    }
  }

  function handleBarcode({ data }: BarcodeScanningResult) {
    void completeScan(data || "zook-demo-approved");
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
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Check in"
            subtitle="Scan QR or enter code"
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
                <ZookButton onPress={() => void requestPermission()} tone="secondary" style={styles.permissionButton}>
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
                placeholder="ZK-4821"
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
      <Text numberOfLines={1} style={styles.validationMiniText}>{label}</Text>
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
});
