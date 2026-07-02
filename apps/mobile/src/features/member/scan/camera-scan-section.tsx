import { Ionicons } from "@expo/vector-icons";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef } from "react";
import { Animated as RNAnimated, Easing as RNEasing, Pressable, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  IconBubble,
  ScannerFrame,
  type PillTone,
  ZookButton,
} from "@/components/primitives";
import type { useT } from "@/lib/i18n";
import { fixedSurfaces, useTheme } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

type Translate = ReturnType<typeof useT>;
type ScanState = "idle" | "checking" | "accepted" | "failed";

export function CameraScanSection({
  busy,
  cameraBadgeSurface,
  cameraBlocked,
  cameraPermissionBusy,
  completed,
  hasCamera,
  scanState,
  t,
  onBarcodeScanned,
  onOpenSettings,
  onRequestCamera,
  onSwitchToCode,
}: {
  busy: boolean;
  cameraBadgeSurface: string;
  cameraBlocked: boolean;
  cameraPermissionBusy: boolean;
  completed: boolean;
  hasCamera: boolean | undefined;
  scanState: ScanState;
  t: Translate;
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
  onOpenSettings: () => void;
  onRequestCamera: () => void;
  onSwitchToCode: () => void;
}) {
  const { palette } = useTheme();

  return (
    <>
      <View
        style={[
          styles.cameraCard,
          { backgroundColor: fixedSurfaces.cameraWell, borderColor: palette.border.strong },
        ]}
      >
        {hasCamera ? (
          <CameraView
            testID="scanner-view"
            accessibilityLabel={t("member.scan.cameraPreviewAccessibility")}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={completed ? undefined : onBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <EmptyState
              icon="camera-outline"
              title={cameraBlocked ? t("member.scan.cameraAccessBlocked") : t("member.scan.enableCamera")}
              body={
                cameraBlocked
                  ? t("member.scan.openDeviceSettings")
                  : t("member.scan.allowCameraQr")
              }
            />
            <ZookButton
              onPress={cameraBlocked ? onOpenSettings : onRequestCamera}
              disabled={cameraPermissionBusy}
              busy={cameraPermissionBusy}
              variant="secondary"
              style={styles.permissionButton}
            >
              {cameraBlocked ? t("member.scan.openSettings") : t("member.scan.allowCamera")}
            </ZookButton>
          </View>
        )}
        <View pointerEvents="none" style={styles.scannerOverlay}>
          <ScannerFrame size={280} tone={toneForScanState(scanState)} transparent>
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
            {busy ? t("member.scan.checkingCode") : t("member.scan.searchingForCode")}
          </Text>
        </View>
      </View>

      <Card variant="compact" contentStyle={styles.helpContent}>
        <IconBubble icon="shield-checkmark-outline" tone="neutral" size={30} />
        <View style={styles.helpCopy}>
          <Text numberOfLines={1} style={[styles.helpTitle, { color: palette.text.primary }]}>
            {t("member.scan.cantScan")}
          </Text>
          <Text numberOfLines={2} style={[styles.helpBody, { color: palette.text.secondary }]}>
            {t("member.scan.enterDeskCodeManually")}
          </Text>
        </View>
        <Pressable
          testID="scan-manual-code"
          onPress={onSwitchToCode}
          accessibilityRole="button"
          accessibilityLabel={t("member.scan.enterManualCodeAccessibility")}
          style={({ pressed }) => [styles.manualCodeLink, pressed ? styles.linkPressed : null]}
        >
          <Text style={[styles.manualCodeLinkText, { color: palette.accent.strong }]}>
            {t("member.scan.enterCode")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={palette.accent.strong} />
        </Pressable>
      </Card>
    </>
  );
}

function toneForScanState(state: ScanState): PillTone {
  if (state === "accepted") return "lime";
  if (state === "checking") return "amber";
  if (state === "failed") return "red";
  return "neutral";
}

function AnimatedLaser({ frameSize = 280 }: { frameSize?: number }) {
  const { palette } = useTheme();
  const progress = useRef(new RNAnimated.Value(0)).current;
  const travel = Math.max(40, frameSize / 2 - 20);

  useEffect(() => {
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
    <RNAnimated.View style={[styles.scanLineRail, animatedStyle]}>
      <View style={[styles.scanLineCore, { backgroundColor: palette.accent.base }]} />
    </RNAnimated.View>
  );
}
