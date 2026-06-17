import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { Role } from "@zook/core";
import { isOrgRole } from "@zook/core/permissions";

import { useAuth } from "@/lib/auth";
import { routeForRole } from "@/lib/route-guards";
import { useTheme } from "@/lib/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeTarget(value?: string | string[]) {
  const target = firstParam(value);
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
}

export default function QaRoleRoute() {
  const { palette } = useTheme();
  const { role, target } = useLocalSearchParams<{
    role?: string | string[];
    target?: string | string[];
  }>();
  const { session, status, switchOrg, switchRole } = useAuth();

  useEffect(() => {
    const nextRole = String(firstParam(role) ?? "").toUpperCase() as Role;
    const nextTarget = safeTarget(target) ?? routeForRole(nextRole);

    if (!nextRole) {
      router.replace("/" as never);
      return;
    }

    if (status !== "authenticated" || !session) {
      const query = new URLSearchParams({
        reset: "1",
        role: nextRole,
        target: nextTarget,
      }).toString();
      router.replace((`/__demo-role?${query}`) as never);
      return;
    }

    if (!isOrgRole(nextRole)) {
      router.replace(nextTarget as never);
      return;
    }

    const matchingOrg = session.organizations.find((organization) =>
      organization.roles.includes(nextRole),
    );
    if (!matchingOrg) {
      const query = new URLSearchParams({
        reset: "1",
        role: nextRole,
        target: nextTarget,
      }).toString();
      router.replace((`/__demo-role?${query}`) as never);
      return;
    }

    void (async () => {
      if (session.activeOrganization?.orgId !== matchingOrg.orgId) {
        await switchOrg(matchingOrg.orgId);
      }
      await switchRole(nextRole);
      router.replace(nextTarget as never);
    })().catch(() => {
      const query = new URLSearchParams({
        reset: "1",
        role: nextRole,
        target: nextTarget,
      }).toString();
      router.replace((`/__demo-role?${query}`) as never);
    });
  }, [role, session, status, switchOrg, switchRole, target]);

  return (
    <View testID="qa-role-screen" style={[styles.container, { backgroundColor: palette.bg.app }]}>
      <ActivityIndicator color={palette.accent.base} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
