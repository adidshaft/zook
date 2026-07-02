import { Linking, Text, View } from "react-native";
import { Card, IconBubble, ZookButton } from "@/components/primitives";
import type { TranslationKey } from "@/lib/i18n";
import type { Palette } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

export function CameraBlockedCard({
  cameraPermissionBusy,
  palette,
  t,
  onRequestCamera,
  onSwitchToCode,
}: {
  cameraPermissionBusy: boolean;
  palette: Palette;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onRequestCamera: () => void;
  onSwitchToCode: () => void;
}) {
  return (
    <Card variant="danger" contentStyle={styles.blockedPermissionContent}>
      <IconBubble icon="camera-outline" tone="red" size={42} />
      <View style={styles.blockedPermissionCopy}>
        <Text style={[styles.cameraFallbackTitle, { color: palette.text.primary }]}>
          {t("member.scan.cameraAccessBlocked")}
        </Text>
        <Text style={[styles.cameraFallbackText, { color: palette.text.secondary }]}>
          {t("member.scan.allowCameraSettings")}
        </Text>
      </View>
      <ZookButton onPress={() => void Linking.openSettings()} variant="secondary" icon="settings-outline">
        {t("member.scan.openSettings")}
      </ZookButton>
      <View style={styles.permissionRecoveryRow}>
        <ZookButton
          onPress={onSwitchToCode}
          variant="secondary"
          icon="keypad-outline"
          style={styles.permissionRecoveryAction}
        >
          {t("member.scan.enterCodeManually")}
        </ZookButton>
        <ZookButton
          onPress={onRequestCamera}
          disabled={cameraPermissionBusy}
          busy={cameraPermissionBusy}
          variant="secondary"
          icon="refresh-outline"
          style={styles.permissionRecoveryAction}
        >
          {t("member.scan.tryCameraAgain")}
        </ZookButton>
      </View>
    </Card>
  );
}
