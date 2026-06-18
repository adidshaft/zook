import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  IconBubble,
  AppHeader,
  Pill,
  QueryErrorState,
  Skeleton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { apiClient, ownerApi } from "@/lib/domain-api";
import { formatInitials, formatLongDate, formatRedactedPhone } from "@/lib/formatting";
import { getStoredValue, phoneRevealStorageKey, setStoredValue } from "@/lib/storage";
import type { OrgMemberRecord } from "@/lib/domains/shared/types";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useEffect, useState } from "react";

type OrgMemberDetailResponse = {
  member: OrgMemberRecord & {
    subscriptions?: Array<{
      id?: string;
      status?: string;
      endsAt?: string | null;
      remainingVisits?: number | null;
    }>;
  };
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { palette, mode } = useTheme();
  const chromeSurface = mode === "dark" ? palette.surface.default : palette.bg.elevated;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [
        styles.iconButton,
        {
          borderColor: palette.border.subtle,
          backgroundColor: chromeSurface,
        },
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
    </Pressable>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: "mail-outline" | "call-outline";
  label: string;
  value: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.contactRow}>
      <IconBubble icon={icon} tone="blue" size={40} />
      <View style={styles.contactCopy}>
        <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>{label}</Text>
        <Text selectable style={[styles.rowValue, { color: palette.text.primary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function OwnerMemberDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const { activeOrgId: resolvedOrgId, token } = useAuth();
  const { palette } = useTheme();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const memberQuery = useQuery({
    queryKey: ["org", resolvedOrgId, "members", id],
    queryFn: () =>
      ownerApi.member<OrgMemberDetailResponse>({
        token,
        orgId: resolvedOrgId,
        memberUserId: id!,
      }),
    enabled: Boolean(token) && Boolean(resolvedOrgId) && Boolean(id),
    select: (data) => data.member,
    retry: false,
  });
  const member = memberQuery.data;
  const name = member?.user?.name ?? "Member";
  const email = member?.user?.email ?? "";
  const phone = member?.user?.phone ?? "";
  const goal = member?.user?.fitnessGoal ?? member?.profile.fitnessGoal ?? "Not set";
  const notes = member?.profile.notes;

  useEffect(() => {
    let mounted = true;
    setPhoneRevealed(false);
    void getStoredValue(phoneRevealStorageKey("owner", resolvedOrgId)).then((stored) => {
      if (!mounted || !id || !stored) return;
      try {
        const parsed = JSON.parse(stored);
        setPhoneRevealed(Array.isArray(parsed) && parsed.includes(id));
      } catch {
        setPhoneRevealed(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id, resolvedOrgId]);

  async function revealPhone() {
    if (!id) return;
    setPhoneRevealed(true);
    try {
      const stored = await getStoredValue(phoneRevealStorageKey("owner", resolvedOrgId));
      const parsed = stored ? JSON.parse(stored) : [];
      const next = new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
      next.add(id);
      await setStoredValue(phoneRevealStorageKey("owner", resolvedOrgId), JSON.stringify(Array.from(next)));
      if (token && resolvedOrgId) {
        await apiClient.request("/audit-logs", {
          method: "POST",
          token,
          orgId: resolvedOrgId,
          body: { action: "MEMBER_PHONE_REVEALED", targetId: id },
        });
      }
    } catch {
      showToast({
        title: "Reveal not logged",
        message: "The phone was shown, but the audit log could not be saved.",
        tone: "amber",
      });
    }
  }

  return (
    <>
      <ZookScreen testID="owner-member-detail-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AppHeader
            title={name}
            subtitle="Owner member profile"
            leading={
              <BackButton
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/owner/members")
                }
              />
            }
            showProfileShortcut={false}
          />

          {memberQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stateContent}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.stateSkeletonCopy}>
                <Skeleton width="72%" height={16} borderRadius={8} />
                <Skeleton width="48%" height={12} borderRadius={6} />
              </View>
            </Card>
          ) : null}

          {memberQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState
                error={memberQuery.error}
                onRetry={() => void memberQuery.refetch()}
                title="Could not load member"
              />
            </Card>
          ) : null}

          {!memberQuery.isLoading && !memberQuery.isError && !member ? (
            <Card variant="compact" contentStyle={styles.stateContent}>
              <IconBubble icon="people-outline" tone="neutral" size={44} />
              <Text style={[styles.stateText, { color: palette.text.primary }]}>
                Member not found
              </Text>
            </Card>
          ) : null}

          {member ? (
            <>
              <Card variant="success" contentStyle={styles.profileContent}>
                <View style={[styles.largeAvatar, { backgroundColor: palette.accent.fill }]}>
                  <Text style={[styles.largeAvatarText, { color: palette.text.onAccent }]}>
                    {formatInitials(name, email)}
                  </Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.memberName, { color: palette.text.primary }]}>
                    Member since
                  </Text>
                  <Text style={[styles.memberEmail, { color: palette.text.secondary }]}>
                    {formatLongDate(member.profile.createdAt)}
                  </Text>
                  <Pill tone="lime">{member.activeSubscription?.status ?? "Profile"}</Pill>
                </View>
              </Card>

              <Card contentStyle={styles.sectionContent}>
                <View style={styles.sectionRow}>
                  <IconBubble icon="barbell-outline" tone="lime" size={42} />
                  <View style={styles.sectionCopy}>
                    <Text style={[styles.sectionLabel, { color: palette.text.secondary }]}>
                      Fitness goal
                    </Text>
                    <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                      {goal}
                    </Text>
                  </View>
                </View>
                {notes ? (
                  <View style={[styles.notesBox, { borderTopColor: palette.border.subtle }]}>
                    <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>Notes</Text>
                    <Text selectable style={[styles.notesText, { color: palette.text.primary }]}>
                      {notes}
                    </Text>
                  </View>
                ) : null}
              </Card>

              <Card contentStyle={styles.sectionContent}>
                <ContactRow icon="mail-outline" label="Email" value={email || "Not available"} />
                {phone ? (
                  <View style={styles.contactRow}>
                    <IconBubble icon="call-outline" tone="blue" size={40} />
                    <View style={styles.contactCopy}>
                      <Text style={[styles.rowLabel, { color: palette.text.secondary }]}>
                        Phone
                      </Text>
                      <Text
                        selectable={phoneRevealed}
                        style={[styles.rowValue, { color: palette.text.primary }]}
                      >
                        {phoneRevealed ? phone : formatRedactedPhone(phone, "Not available")}
                      </Text>
                    </View>
                    {!phoneRevealed ? (
                      <Pressable
                        onPress={() => void revealPhone()}
                        accessibilityRole="button"
                        accessibilityLabel={`Reveal phone for ${name}`}
                        style={({ pressed }) => [
                          styles.revealPhoneButton,
                          { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
                          pressed ? styles.revealPhoneButtonPressed : null,
                        ]}
                      >
                        <Ionicons name="eye-outline" size={15} color={palette.accent.base} />
                        <Text style={[styles.revealPhoneText, { color: palette.accent.base }]}>
                          Reveal
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            </>
          ) : null}
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
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.md,
    paddingBottom: 96,
  },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconButtonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  stateContent: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.md },
  stateSkeletonCopy: { flex: 1, gap: 8 },
  stateText: typography.cardTitle,
  profileContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  largeAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  largeAvatarText: typography.headerTitle,
  profileCopy: { flex: 1, gap: 5, alignItems: "flex-start" },
  memberName: typography.headerTitle,
  memberEmail: typography.small,
  sectionContent: { gap: spacing.md },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sectionCopy: { flex: 1, gap: 3 },
  sectionLabel: typography.caption,
  sectionTitle: typography.cardTitle,
  notesBox: { borderTopWidth: 1, paddingTop: spacing.md, gap: 4 },
  notesText: typography.body,
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  contactCopy: { flex: 1, gap: 3 },
  rowLabel: typography.caption,
  rowValue: typography.bodyStrong,
  revealPhoneButton: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  revealPhoneButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  revealPhoneText: typography.caption,
});
