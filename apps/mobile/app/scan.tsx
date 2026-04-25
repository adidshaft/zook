import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { PrimaryButton, Screen, SecondaryButton, GlassInput, ScreenHeader } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [manualToken, setManualToken] = useState("");
  const [showManual, setShowManual] = useState(false);
  
  const [statusState, setStatusState] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Point at the QR code.");
  const [submitting, setSubmitting] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  
  const permissionReady = permission !== null;
  const canUseCamera = permission?.granted ?? false;
  const needsManualFallback = permissionReady && !canUseCamera;

  async function submitScan(qrPayload: string) {
    if (!token || !qrPayload || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await mobileApiFetch<{
        status: string;
        duplicate?: boolean;
        suspiciousFlags?: string[];
      }>("/attendance/scan", {
        method: "POST",
        token,
        body: { qrPayload }
      });
      
      if (result.duplicate || result.status === "APPROVED" || result.status === "PENDING_APPROVAL") {
        setStatusState("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }).start();
      } else {
        setStatusState("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (result.duplicate) {
        setStatusMessage("Already checked in.");
      } else if (result.status === "APPROVED") {
        setStatusMessage("You're in! ✓");
      } else if (result.status === "PENDING_APPROVAL") {
        setStatusMessage("Pending approval.");
      } else {
        setStatusMessage(`Scan result: ${result.status}`);
      }
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] })
      ]);
      
      setTimeout(() => {
        setStatusState("idle");
        setStatusMessage("Point at the QR code.");
        Animated.timing(successScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 3000);
      
    } catch (error) {
      setStatusState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusMessage(error instanceof Error ? error.message : "Unable to validate.");
      
      setTimeout(() => {
        setStatusState("idle");
        setStatusMessage("Point at the QR code.");
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {!permissionReady ? (
          <View style={styles.centerBox}>
            <Text style={styles.body}>Checking camera permission…</Text>
          </View>
        ) : null}

        {canUseCamera ? (
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={(event) => {
                if (statusState === "idle" && !submitting && !showManual) {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   void submitScan(event.data);
                }
              }}
            />
            <View style={styles.overlayWrapper}>
               <View style={styles.overlayTop} />
               <View style={styles.overlayMiddleRow}>
                 <View style={styles.overlaySide} />
                 <View style={[styles.cutout, statusState === "success" && styles.cutoutSuccess, statusState === "error" && styles.cutoutError]} />
                 <View style={styles.overlaySide} />
               </View>
               <View style={styles.overlayBottom} />
               <Animated.View style={[styles.successOverlay, { transform: [{ scale: successScale }], opacity: successScale }]}>
                 <Ionicons name="checkmark-circle" size={100} color={colors.lime} />
               </Animated.View>
            </View>
          </View>
        ) : null}

        {needsManualFallback ? (
           <View style={styles.permissionState}>
             <ScreenHeader title="Camera Access" subtitle="Allow camera to scan QR codes." />
             <PrimaryButton onPress={requestPermission}>Allow Camera</PrimaryButton>
           </View>
        ) : null}
        
        <View style={[styles.headerAbsolute, { top: Math.max(insets.top, 60) }]}>
           <Pressable onPress={() => router.back()} style={styles.closeButton}>
             <Ionicons name="close" size={28} color="white" />
           </Pressable>
           <Text style={styles.headerTitle}>Scan In</Text>
        </View>

        <View style={[styles.statusAbsolute, { bottom: insets.bottom + 80 }]}>
           <BlurView intensity={60} tint="dark" style={styles.statusPill}>
              <Text style={[styles.statusText, statusState === "success" && styles.statusTextSuccess, statusState === "error" && styles.statusTextError]}>
                {statusMessage}
              </Text>
           </BlurView>

           {__DEV__ ? (
             <Pressable onPress={() => setShowManual(!showManual)} style={styles.devToggle}>
               <Text style={styles.devToggleText}>Dev: Manual Entry</Text>
             </Pressable>
           ) : null}
        </View>

        {__DEV__ && showManual ? (
          <BlurView intensity={90} tint="dark" style={[StyleSheet.absoluteFill, styles.manualOverlay, { paddingTop: insets.top + 40 }]}>
            <ScreenHeader title="Manual Token" subtitle="Paste QR payload." />
            <GlassInput
              placeholder="Paste QR token"
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <PrimaryButton onPress={() => {
               setShowManual(false);
               void submitScan(manualToken);
            }}>
              {submitting ? "Validating..." : "Submit token"}
            </PrimaryButton>
            <SecondaryButton onPress={() => setShowManual(false)}>Cancel</SecondaryButton>
          </BlurView>
        ) : null}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { color: colors.muted, lineHeight: 20 },
  permissionState: { padding: 40, gap: 20, justifyContent: "center", flex: 1 },
  overlayWrapper: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  overlayMiddleRow: { flexDirection: "row", height: 280 },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  cutout: { width: 280, height: 280, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "transparent" },
  cutoutSuccess: { borderColor: colors.lime, borderWidth: 4 },
  cutoutError: { borderColor: colors.red, borderWidth: 4 },
  successOverlay: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 50,
    padding: 10,
  },
  overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  headerAbsolute: { position: "absolute", left: 0, right: 0, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  closeButton: { position: "absolute", left: 20, padding: 8, zIndex: 10 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  statusAbsolute: { position: "absolute", left: 0, right: 0, alignItems: "center", gap: 16 },
  statusPill: { borderRadius: 999, paddingHorizontal: 24, paddingVertical: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  statusText: { color: "white", fontSize: 16, fontWeight: "700" },
  statusTextSuccess: { color: colors.lime },
  statusTextError: { color: colors.red },
  devToggle: { padding: 10 },
  devToggleText: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "600" },
  manualOverlay: { padding: 24, gap: 16 },
});
