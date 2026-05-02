import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AuditWarning,
  BottomNav,
  CollapsibleSection,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  PrimaryButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { privacyApi } from "@/lib/domain-api";
import { useMyConsents } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function Settings() {
  const router = useRouter();
  const { logout, session, token } = useAuth();
  const privacyQuery = useMyConsents();
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const latestExport = privacyQuery.data?.exportRequests?.[0] ?? null;
  const latestDeletion = privacyQuery.data?.deletionRequests?.[0] ?? null;

  async function requestPrivacyExport() {
    if (!token) return;
    setBusy(true);
    try {
      await privacyApi.requestDataExport({ token });
      await privacyQuery.refetch();
      setPrivacyStatus("Export requested. You'll receive an email when it's ready.");
    } catch (error) {
      setPrivacyStatus(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function requestPrivacyDeletion() {
    if (!token) return;
    setBusy(true);
    try {
      await privacyApi.requestAccountDeletion({ token });
      await privacyQuery.refetch();
      setPrivacyStatus("Deletion requested. This is being reviewed before execution.");
    } catch (error) {
      setPrivacyStatus(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Settings"
            subtitle="Account and privacy"
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          <CollapsibleSection title="Privacy" subtitle="Export or delete data" defaultOpen>
            <AuditWarning>These requests are saved and reviewed before anything changes.</AuditWarning>
            <View style={styles.actionRow}>
              <PrimaryButton onPress={() => void requestPrivacyExport()} tone="secondary" style={styles.actionHalf} disabled={busy}>
                Export
              </PrimaryButton>
              <PrimaryButton onPress={() => void requestPrivacyDeletion()} tone="danger" style={styles.actionHalf} disabled={busy}>
                Delete
              </PrimaryButton>
            </View>
            {privacyStatus ? <Text style={styles.statusText}>{privacyStatus}</Text> : null}
            <GlassCard variant="compact" contentStyle={styles.privacyStatusCard}>
              <ListRow
                title="Latest export"
                subtitle={latestExport ? privacyStatusLine(latestExport.status, latestExport.completedAt ?? latestExport.createdAt) : "No export request yet"}
                icon="download-outline"
                tone={latestExport?.status === "ready" ? "lime" : "blue"}
              />
              <ListRow
                title="Latest deletion"
                subtitle={latestDeletion ? privacyStatusLine(latestDeletion.status, latestDeletion.scheduledFor ?? latestDeletion.createdAt) : "No deletion request yet"}
                icon="trash-outline"
                tone={latestDeletion ? "amber" : "neutral"}
              />
            </GlassCard>
          </CollapsibleSection>

          <CollapsibleSection title="Account" subtitle={session?.user.email ?? "Signed in"} defaultOpen={false}>
            <GlassCard variant="compact" contentStyle={styles.accountContent}>
              <IconBubble icon="person-outline" tone="blue" size={36} />
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{session?.user.name ?? "Zook user"}</Text>
                <Text style={styles.accountEmail}>{session?.user.email ?? session?.user.phone ?? ""}</Text>
              </View>
            </GlassCard>
            <PrimaryButton onPress={() => void logout()} tone="danger">
              Logout
            </PrimaryButton>
          </CollapsibleSection>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function privacyStatusLine(status: string, date?: string | null) {
  const label = status.replace(/_/g, " ");
  if (!date) {
    return label;
  }
  return `${label} · ${new Date(date).toLocaleDateString()}`;
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: layout.bottomNavHeight + 40,
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  statusText: {
    color: colors.lime,
    ...typography.small,
  },
  accountContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  privacyStatusCard: {
    gap: spacing.sm,
  },
  accountCopy: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    color: colors.text,
    ...typography.cardTitle,
  },
  accountEmail: {
    color: colors.muted,
    ...typography.small,
  },
});
