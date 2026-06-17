import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { deleteStoredValue } from "@/lib/storage";
import type {
  OrgMemberRecord,
  ReceptionQueueRecord,
  TrainerClientRecord,
} from "@/lib/domains/shared/types";
import { useTheme } from "@/lib/theme";

type QaOpenKind =
  | "member-attendance-detail"
  | "member-shop"
  | "owner-member-detail"
  | "trainer-client-detail"
  | "trainer-client-plan"
  | "trainer-client-sessions"
  | "reception-member-detail"
  | "reception-verification";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function fallbackRoute(kind: QaOpenKind) {
  switch (kind) {
    case "member-attendance-detail":
      return "/tracking-history";
    case "member-shop":
      return "/shop";
    case "owner-member-detail":
      return "/owner/members";
    case "trainer-client-detail":
      return "/trainer/clients";
    case "trainer-client-plan":
      return "/trainer/plans";
    case "trainer-client-sessions":
      return "/trainer/clients";
    case "reception-member-detail":
      return "/reception/members";
    case "reception-verification":
      return "/reception";
    default:
      return "/";
  }
}

export default function QaOpenRoute() {
  const { palette } = useTheme();
  const { activeOrgId, session, status, token } = useAuth();
  const { selectBranch } = useBranchSelection();
  const { kind } = useLocalSearchParams<{ kind?: string | string[] }>();

  useEffect(() => {
    const resolvedKind = firstParam(kind) as QaOpenKind | undefined;
    if (!resolvedKind) {
      router.replace("/" as never);
      return;
    }
    if (status !== "authenticated" || !token || !activeOrgId) {
      if (status === "unauthenticated") {
        router.replace("/login" as never);
      }
      return;
    }

    let cancelled = false;

    async function openResolvedRoute() {
      if (resolvedKind === "member-attendance-detail") {
        const data = await mobileApiFetch<{
          activeCheckIn?: { id?: string | null } | null;
          recentAttendance?: Array<{ id?: string | null }>;
        }>("/me/home", {
          token,
          orgId: activeOrgId,
        });
        const recordId = data.activeCheckIn?.id ?? data.recentAttendance?.find((record) => record.id)?.id;
        router.replace((recordId ? `/attendance/${recordId}` : fallbackRoute(resolvedKind)) as never);
        return;
      }

      if (resolvedKind === "member-shop") {
        const storageOrgId = activeOrgId ?? "default";
        const cartStorageKey = `zook_shop_cart_${storageOrgId}`;
        await deleteStoredValue(cartStorageKey);
        router.replace("/shop?qaBrowse=1" as never);
        return;
      }

      if (resolvedKind === "owner-member-detail" || resolvedKind === "reception-member-detail") {
        const data = await mobileApiFetch<{ members: OrgMemberRecord[] }>(
          `/orgs/${activeOrgId}/members`,
          { token, orgId: activeOrgId },
        );
        const memberId =
          data.members.find((member) => member.profile.userId)?.profile.userId ??
          data.members.find((member) => member.user?.id)?.user?.id;
        const next =
          resolvedKind === "owner-member-detail"
            ? memberId
              ? `/owner/member/${memberId}`
              : fallbackRoute(resolvedKind)
            : memberId
              ? `/reception/members/${memberId}`
              : fallbackRoute(resolvedKind);
        router.replace(next as never);
        return;
      }

      if (
        resolvedKind === "trainer-client-detail" ||
        resolvedKind === "trainer-client-plan" ||
        resolvedKind === "trainer-client-sessions"
      ) {
        const trainerUserId = session?.user.id;
        if (!trainerUserId) {
          router.replace(fallbackRoute(resolvedKind) as never);
          return;
        }
        const data = await mobileApiFetch<{ clients: TrainerClientRecord[] }>(
          `/orgs/${activeOrgId}/trainers/${trainerUserId}/clients`,
          { token, orgId: activeOrgId },
        );
        const clientId = data.clients[0]?.memberUserId;
        const next =
          resolvedKind === "trainer-client-detail"
            ? clientId
              ? `/trainer/clients/${clientId}`
              : fallbackRoute(resolvedKind)
            : resolvedKind === "trainer-client-plan"
              ? clientId
                ? `/trainer/clients/${clientId}/plan`
                : fallbackRoute(resolvedKind)
              : clientId
                ? `/trainer/clients/${clientId}/sessions`
                : fallbackRoute(resolvedKind);
        router.replace(next as never);
        return;
      }

      if (resolvedKind === "reception-verification") {
        const queue = await mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
          `/orgs/${activeOrgId}/attendance/live`,
          { token, orgId: activeOrgId },
        );
        const record =
          queue.records.find((candidate) => candidate.status === "FLAGGED") ??
          queue.records.find((candidate) => candidate.status === "PENDING_APPROVAL") ??
          queue.records[0];
        if (record?.branchId) {
          await selectBranch(record.branchId).catch(() => undefined);
        }
        router.replace(
          (record?.id ? `/reception/verification/${record.id}` : fallbackRoute(resolvedKind)) as never,
        );
      }
    }

    void openResolvedRoute().catch(() => {
      if (!cancelled) {
        router.replace(fallbackRoute(resolvedKind) as never);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeOrgId, kind, selectBranch, session?.user.id, status, token]);

  return (
    <View testID="qa-open-screen" style={[styles.container, { backgroundColor: palette.bg.app }]}>
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
