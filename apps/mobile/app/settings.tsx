import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookMockServices } from "@zook/core";
import {
  AuditWarning,
  CollapsibleSection,
  MobileHeader,
  PrimaryButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function Settings() {
  const router = useRouter();
  const { logout, session } = useAuth();
  const [privacyStatus, setPrivacyStatus] = useState("");

  async function requestPrivacyExport() {
    const job = await zookMockServices.privacyService.requestExport(session?.user.id);
    setPrivacyStatus(`Export requested. ${job.status}.`);
  }

  async function requestPrivacyDeletion() {
    const job = await zookMockServices.privacyService.requestDeletion(session?.user.id);
    setPrivacyStatus(`Deletion requested. ${job.status}.`);
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
              <PrimaryButton onPress={() => void requestPrivacyExport()} tone="secondary" style={styles.actionHalf}>
                Export
              </PrimaryButton>
              <PrimaryButton onPress={() => void requestPrivacyDeletion()} tone="danger" style={styles.actionHalf}>
                Delete
              </PrimaryButton>
            </View>
            {privacyStatus ? <Text style={styles.statusText}>{privacyStatus}</Text> : null}
          </CollapsibleSection>

          <CollapsibleSection title="Account" subtitle={session?.user.email ?? "Signed in"} defaultOpen={false}>
            <PrimaryButton onPress={() => void logout()} tone="danger">
              Logout
            </PrimaryButton>
          </CollapsibleSection>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: 54,
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
});
