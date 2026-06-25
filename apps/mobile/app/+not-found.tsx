import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { EmptyState, ZookButton, ZookScreen } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { routeForRole } from "@/lib/route-guards";
import { useRoleContext } from "@/lib/role-context";
import { spacing, typography, useTheme } from "@/lib/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  const roleContext = useRoleContext();
  const { palette } = useTheme();
  const t = useT();
  const homeRoute = roleContext?.isPlatformAdmin
    ? routeForRole(roleContext.role)
    : routeForRole(roleContext?.role ?? "MEMBER");

  return (
    <ZookScreen style={styles.screen}>
      <EmptyState
        icon="compass-outline"
        title={t("notFound.title")}
        body={t("notFound.body")}
        action={
          <>
            <ZookButton onPress={() => router.replace(homeRoute as never)} fullWidth>
              {t("notFound.goWorkspace")}
            </ZookButton>
            <Text style={[styles.helperText, { color: palette.text.secondary }]}>
              {t("notFound.helper")}
            </Text>
          </>
        }
      />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
