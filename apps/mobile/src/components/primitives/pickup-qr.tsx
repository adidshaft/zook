import QRCode from "react-native-qrcode-svg";
import { StyleSheet, View } from "react-native";
import { useT } from "@/lib/i18n";
import { elevation, fixedSurfaces, radii, spacing, useTheme } from "@/lib/theme";

export function PickupQrCode({ value, size = 176 }: { value: string; size?: number }) {
  const { mode, palette } = useTheme();
  const t = useT();
  const isDark = mode === "dark";
  const qrShadow = elevation(2, palette.bg.sunken, {
    shadowOpacity: isDark ? 0.2 : 0.08,
  });
  return (
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
        <QRCode
          value={value}
          size={size}
          backgroundColor={fixedSurfaces.qrPaper}
          color={fixedSurfaces.qrInk}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.mainCard,
    padding: 8,
  },
  paper: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fixedSurfaces.qrPaper,
    borderRadius: 18,
    padding: spacing.md,
  },
});
