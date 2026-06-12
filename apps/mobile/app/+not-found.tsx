import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { EmptyState, ZookButton, ZookScreen } from "@/components/primitives";
import { routeForRole } from "@/lib/route-guards";
import { useRoleContext } from "@/lib/role-context";
import { spacing, typography, useTheme } from "@/lib/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  const roleContext = useRoleContext();
  const { palette } = useTheme();
  const homeRoute = roleContext?.isPlatformAdmin
    ? routeForRole(roleContext.role)
    : routeForRole(roleContext?.role ?? "MEMBER");

  return (
    <ZookScreen style={styles.screen}>
      <EmptyState
        icon="compass-outline"
        title="This screen is not available"
        body="The link may be old, or this role may not have access to that workflow."
        action={
          <>
            <ZookButton onPress={() => router.replace(homeRoute as never)} fullWidth>
              Go to my workspace
            </ZookButton>
            <Text style={[styles.helperText, { color: palette.text.secondary }]}>
              Return to your workspace to continue.
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
