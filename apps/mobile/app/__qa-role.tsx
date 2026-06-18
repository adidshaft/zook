import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { Role } from "@zook/core";
import { isOrgRole } from "@zook/core/permissions";

import { useAuth } from "@/lib/auth";
import { routeForRole } from "@/lib/route-guards";
import { useTheme } from "@/lib/theme";

async function clearCachedNotificationResponse() {
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.clearLastNotificationResponseAsync();
  } catch {
    // Best-effort only. QA routing should not fail if notifications are unavailable.
  }
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function decodePayload(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return null;
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as {
      role?: string;
      target?: string;
      view?: string;
    };
    return json;
  } catch {
    return null;
  }
}

function safeTarget(value?: string | string[]) {
  const target = firstParam(value);
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
}

function targetWithView(target: string, view?: string | string[]) {
  const nextView = firstParam(view);
  if (!nextView) return target;
  if (target === "/owner") {
    if (nextView === "members") return "/owner/members";
    if (nextView === "approvals") return "/owner/approvals";
    if (nextView === "revenue") return "/owner/revenue";
    if (nextView === "stock") return "/owner/stock";
  }
  if (target === "/reception") {
    if (nextView === "members") return "/reception/members";
    if (nextView === "payments") return "/reception/payments";
    if (nextView === "orders") return "/reception/orders";
  }
  if (target === "/trainer") {
    if (nextView === "clients") return "/trainer/clients";
    if (nextView === "plans") return "/trainer/plans";
    if (nextView === "payouts") return "/trainer/payouts";
  }
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}view=${encodeURIComponent(nextView)}`;
}

export default function QaRoleRoute() {
  const { palette } = useTheme();
  const { payload, role, target, view } = useLocalSearchParams<{
    payload?: string | string[];
    role?: string | string[];
    target?: string | string[];
    view?: string | string[];
  }>();
  const { session, status, switchOrg, switchRole } = useAuth();

  useEffect(() => {
    const decodedPayload = decodePayload(payload);
    const nextRole = String(decodedPayload?.role ?? firstParam(role) ?? "").toUpperCase() as Role;
    const requestedTarget = safeTarget(decodedPayload?.target ?? target);
    const requestedView = decodedPayload?.view ?? firstParam(view);
    const nextTarget = targetWithView(requestedTarget ?? routeForRole(nextRole), requestedView);

    const fallbackQuery = new URLSearchParams({
      payload: encodeURIComponent(
        JSON.stringify({
          reset: "1",
          role: nextRole,
          target: requestedTarget ?? routeForRole(nextRole),
          ...(requestedView ? { view: requestedView } : {}),
        }),
      ),
    }).toString();

    if (!nextRole) {
      router.replace("/" as never);
      return;
    }

    if (status !== "authenticated" || !session) {
      router.replace((`/__demo-role?${fallbackQuery}`) as never);
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
      router.replace((`/__demo-role?${fallbackQuery}`) as never);
      return;
    }

    void (async () => {
      await clearCachedNotificationResponse();
      if (session.activeOrganization?.orgId !== matchingOrg.orgId) {
        await switchOrg(matchingOrg.orgId);
      }
      await switchRole(nextRole);
      router.replace(nextTarget as never);
    })().catch(() => {
      router.replace((`/__demo-role?${fallbackQuery}`) as never);
    });
  }, [payload, role, session, status, switchOrg, switchRole, target, view]);

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
