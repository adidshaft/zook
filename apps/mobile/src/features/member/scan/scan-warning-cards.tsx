import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, ZookButton } from "@/components/primitives";
import type { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { scanStyles as styles } from "@/features/route-surfaces/member-scan-route.styles";

type Translate = ReturnType<typeof useT>;

export function ScanErrorCard({
  errorMessage,
  needsProfilePhoto,
  t,
  onAddPhoto,
  onResetScan,
}: {
  errorMessage: string;
  needsProfilePhoto: boolean;
  t: Translate;
  onAddPhoto: () => void;
  onResetScan: () => void;
}) {
  const { palette } = useTheme();
  if (!errorMessage) return null;

  return (
    <Card variant="warning" contentStyle={styles.errorContent}>
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle-outline" size={18} color={palette.feedback.warning} />
        <Text style={[styles.errorText, { color: palette.text.primary }]}>{errorMessage}</Text>
      </View>
      <ZookButton
        onPress={needsProfilePhoto ? onAddPhoto : onResetScan}
        variant="secondary"
        icon={needsProfilePhoto ? "person-circle-outline" : "refresh-outline"}
        style={styles.retryButton}
      >
        {needsProfilePhoto ? t("member.scan.addPhoto") : t("member.scan.scanAgain")}
      </ZookButton>
    </Card>
  );
}

export function QueuedScanWarningCard({
  queuedScanCount,
  replayingQueue,
  t,
  onReplayQueuedScans,
}: {
  queuedScanCount: number;
  replayingQueue: boolean;
  t: Translate;
  onReplayQueuedScans: () => void;
}) {
  const { palette } = useTheme();
  if (queuedScanCount <= 0) return null;

  return (
    <Card variant="warning" contentStyle={styles.errorContent}>
      <View style={styles.errorRow}>
        <Ionicons name="cloud-upload-outline" size={18} color={palette.feedback.warning} />
        <Text style={[styles.errorText, { color: palette.text.primary }]}>
          {t(queuedScanCount === 1 ? "member.scan.queuedScanWaiting" : "member.scan.queuedScansWaiting", {
            count: queuedScanCount,
          })}
        </Text>
      </View>
      <ZookButton
        onPress={onReplayQueuedScans}
        variant="secondary"
        icon="refresh-outline"
        busy={replayingQueue}
        busyLabel={t("common.saving")}
        style={styles.retryButton}
      >
        {t("member.scan.retryNow")}
      </ZookButton>
    </Card>
  );
}
