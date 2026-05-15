import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  Pill,
  QueryErrorState,
  Skeleton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { apiClient, ownerApi } from "@/lib/domain-api";
import { formatLongDate } from "@/lib/formatting";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import type { OrgMemberRecord } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";
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

function initialsFor(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Member";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function redactPhone(phone?: string | null) {
  if (!phone) return "Not available";
  return `****${phone.slice(-4)}`;
}

function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_owner_phones_${orgId ?? "none"}`;
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={styles.iconButton}
    >
      <Ionicons name="chevron-back" size={21} color={colors.text} />
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
  return (
    <View style={styles.contactRow}>
      <IconBubble icon={icon} tone="blue" size={40} />
      <View style={styles.contactCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text selectable style={styles.rowValue}>
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
    void getStoredValue(phoneRevealStorageKey(resolvedOrgId)).then((stored) => {
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
      const stored = await getStoredValue(phoneRevealStorageKey(resolvedOrgId));
      const parsed = stored ? JSON.parse(stored) : [];
      const next = new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
      next.add(id);
      await setStoredValue(phoneRevealStorageKey(resolvedOrgId), JSON.stringify(Array.from(next)));
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
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title={name}
            subtitle="Owner member profile"
            leading={
              <BackButton
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/owner?view=members")
                }
              />
            }
            showProfileShortcut={false}
          />

          {memberQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.stateContent}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.stateSkeletonCopy}>
                <Skeleton width="72%" height={16} borderRadius={8} />
                <Skeleton width="48%" height={12} borderRadius={6} />
              </View>
            </GlassCard>
          ) : null}

          {!memberQuery.isLoading && !member ? (
            <GlassCard variant="compact" contentStyle={styles.stateContent}>
              <IconBubble icon="people-outline" tone="neutral" size={44} />
              <Text style={styles.stateText}>Member not found</Text>
            </GlassCard>
          ) : null}

          {memberQuery.isError ? (
            <GlassCard variant="compact">
              <QueryErrorState
                error={memberQuery.error}
                onRetry={() => void memberQuery.refetch()}
                title="Could not load member"
              />
            </GlassCard>
          ) : null}

          {member ? (
            <>
              <GlassCard variant="success" contentStyle={styles.profileContent}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>{initialsFor(name, email)}</Text>
                </View>
                <View style={styles.profileCopy}>
                  <Text style={styles.memberName}>Member since</Text>
                  <Text style={styles.memberEmail}>{formatLongDate(member.profile.createdAt)}</Text>
                  <Pill tone="lime">{member.activeSubscription?.status ?? "Profile"}</Pill>
                </View>
              </GlassCard>

              <GlassCard contentStyle={styles.sectionContent}>
                <View style={styles.sectionRow}>
                  <IconBubble icon="barbell-outline" tone="lime" size={42} />
                  <View style={styles.sectionCopy}>
                    <Text style={styles.sectionLabel}>Fitness goal</Text>
                    <Text style={styles.sectionTitle}>{goal}</Text>
                  </View>
                </View>
                {notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.rowLabel}>Notes</Text>
                    <Text selectable style={styles.notesText}>
                      {notes}
                    </Text>
                  </View>
                ) : null}
              </GlassCard>

              <GlassCard contentStyle={styles.sectionContent}>
                <ContactRow icon="mail-outline" label="Email" value={email || "Not available"} />
                {phone ? (
                  <View style={styles.contactRow}>
                    <IconBubble icon="call-outline" tone="blue" size={40} />
                    <View style={styles.contactCopy}>
                      <Text style={styles.rowLabel}>Phone</Text>
                      <Text selectable={phoneRevealed} style={styles.rowValue}>
                        {phoneRevealed ? phone : redactPhone(phone)}
                      </Text>
                    </View>
                    {!phoneRevealed ? (
                      <Pressable
                        onPress={() => void revealPhone()}
                        accessibilityRole="button"
                        accessibilityLabel={`Reveal phone for ${name}`}
                        style={styles.revealPhoneButton}
                      >
                        <Text style={styles.revealPhoneText}>Reveal</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </GlassCard>
            </>
          ) : null}
        </ScrollView>
        <BottomNav role="OWNER" activeView="members" />
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
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding + 32,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  stateContent: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stateSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
  stateText: {
    color: colors.text,
    ...typography.cardTitle,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  largeAvatarText: {
    color: colors.bg,
    ...typography.h2,
  },
  profileCopy: {
    flex: 1,
    gap: 5,
    alignItems: "flex-start",
  },
  memberName: {
    color: colors.text,
    ...typography.headerTitle,
  },
  memberEmail: {
    color: colors.muted,
    ...typography.small,
  },
  memberPhone: {
    color: colors.muted,
    ...typography.body,
  },
  sectionContent: {
    gap: spacing.md,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: 3,
  },
  sectionLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  notesBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  notesText: {
    color: colors.text,
    ...typography.body,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  contactCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  rowValue: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  revealPhoneButton: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  revealPhoneText: {
    color: colors.lime,
    ...typography.caption,
  },
});
