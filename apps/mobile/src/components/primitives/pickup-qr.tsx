import QRCode from "react-native-qrcode-svg";
import { StyleSheet, View } from "react-native";
import Reanimated from "@/lib/reanimated-lite";
import { useBreathingScale } from "@/lib/motion";
import { useT } from "@/lib/i18n";
import { elevation, radii, spacing, useTheme } from "@/lib/theme";

const qrPaper = "#FFFFFF";
const qrInk = "#11150F";

export function PickupQrCode({ value }: { value: string }) {
  const breathingStyle = useBreathingScale(true);
  const { mode, palette } = useTheme();
  const t = useT();
  const isDark = mode === "dark";
  const qrShadow = elevation(2, palette.bg.sunken, {
    shadowOpacity: isDark ? 0.2 : 0.08,
  });
  return (
    <Reanimated.View style={breathingStyle}>
      <View
        accessibilityRole="image"
        accessibilityLabel={t("shop.signedPickupQrCode")}
        style={[
          styles.shell,
          {
            backgroundColor: isDark ? palette.surface.raised : palette.bg.elevated,
            borderColor: palette.border.subtle,
          },
          qrShadow,
        ]}
      >
        <View style={styles.paper}>
          <QRCode value={value} size={176} backgroundColor={qrPaper} color={qrInk} />
        </View>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.mainCard,
    padding: 10,
  },
  paper: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: qrPaper,
    borderRadius: 18,
    padding: spacing.lg,
  },
});
