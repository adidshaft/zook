import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card, ZookButton } from "@/components/primitives";
import type { TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export function ShopBrowserReturnCard({
  checking,
  t,
  onCheckStatus,
}: {
  checking: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onCheckStatus: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Card variant="compact" contentStyle={styles.browserReturnContent}>
      <Ionicons name="open-outline" size={22} color={palette.feedback.warning} />
      <View style={styles.browserReturnCopy}>
        <Text style={[styles.browserReturnTitle, { color: palette.text.primary }]}>
          {t("shop.continueInBrowser")}
        </Text>
        <Text style={[styles.browserReturnBody, { color: palette.text.secondary }]}>
          {t("shop.browserReturnBody")}
        </Text>
      </View>
      <ZookButton
        variant="secondary"
        disabled={checking}
        onPress={onCheckStatus}
        icon="refresh-outline"
      >
        {checking ? t("shop.checking") : t("shop.checkStatus")}
      </ZookButton>
    </Card>
  );
}
