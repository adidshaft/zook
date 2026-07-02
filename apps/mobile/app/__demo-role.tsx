import { Redirect, useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { QA_TEST_OTP, type Role } from "@zook/core";
import { isOrgRole } from "@zook/core/permissions";

import { useAuth } from "@/lib/auth";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { isOfflineDemoEnabled } from "@/lib/runtime-mode";
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

function safeTarget(value?: string | string[]) {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function decodePayload(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return null;
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as {
      reset?: string;
      role?: string;
      target?: string;
      view?: string;
    };
    return json;
  } catch {
    return null;
  }
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

function seededEmailForRole(role: Role) {
  if (role === "PLATFORM_ADMIN") return "platform@zook.local";
  if (role === "OWNER") return "owner@zook.local";
  if (role === "ADMIN") return "admin@zook.local";
  if (role === "RECEPTIONIST") return "reception@zook.local";
  if (role === "TRAINER") return "trainer@zook.local";
  return "member@zook.local";
}

export default function DemoRoleSwitchRoute() {
  const { palette } = useTheme();
  const { payload, role, target, reset, view } = useLocalSearchParams<{
    payload?: string;
    role?: string;
    target?: string;
    reset?: string;
    view?: string;
  }>();
  const { requestOtp, resetQaSession, session, switchOrg, switchRole, verifyOtp } = useAuth();
  const demoEnabled = isOfflineDemoEnabled();

  useEffect(() => {
    if (!demoEnabled) {
      router.replace("/" as never);
      return;
    }
    const decodedPayload = decodePayload(payload);
    const nextRole = String(
      decodedPayload?.role ?? (Array.isArray(role) ? role[0] : role ?? ""),
    ).toUpperCase() as Role;
    const requestedTarget = safeTarget(decodedPayload?.target ?? target);
    const requestedView = decodedPayload?.view ?? view;
    const nextTarget = targetWithView(requestedTarget ?? routeForRole(nextRole), requestedView);
    const shouldReset =
      String(decodedPayload?.reset ?? (Array.isArray(reset) ? reset[0] : reset ?? "")) === "1";
    if (!nextRole) {
      router.replace("/" as never);
      return;
    }

    if (isOfflineDemoMode() && isOrgRole(nextRole)) {
      void clearCachedNotificationResponse()
        .then(() => switchRole(nextRole))
        .then(() => {
          router.replace(nextTarget as never);
        })
        .catch(() => {
          router.replace("/" as never);
        });
      return;
    }

    const email = seededEmailForRole(nextRole);
    const start = shouldReset ? resetQaSession().then(() => undefined) : Promise.resolve();
    void start
      .then(() => clearCachedNotificationResponse())
      .then(() => requestOtp(email))
      .then(() => verifyOtp(email, QA_TEST_OTP))
      .then(async () => {
        if (isOrgRole(nextRole)) {
          const matchingOrg = session?.organizations.find((organization) =>
            organization.roles.includes(nextRole),
          );
          if (matchingOrg && session?.activeOrganization?.orgId !== matchingOrg.orgId) {
            await switchOrg(matchingOrg.orgId);
          }
          await switchRole(nextRole);
        }
      })
      .then(() => {
        router.replace(nextTarget as never);
      })
      .catch(() => {
        const fallbackRole = session?.user.isPlatformAdmin ? "/platform" : "/";
        router.replace(fallbackRole as never);
      });
  }, [
    payload,
    requestOtp,
    reset,
    resetQaSession,
    role,
    session?.user.isPlatformAdmin,
    session?.activeOrganization?.orgId,
    session?.organizations,
    switchOrg,
    switchRole,
    target,
    verifyOtp,
    view,
    demoEnabled,
  ]);

  if (!demoEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <View
      testID="demo-role-switch-screen"
      style={[styles.container, { backgroundColor: palette.bg.app }]}
    >
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
