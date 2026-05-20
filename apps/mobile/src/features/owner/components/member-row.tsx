import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/components/primitives";
import type { OrgMemberRecord } from "@/lib/domains/shared/types";
import { colors, spacing, typography } from "@/lib/theme";
import { memberInitials, redactPhone } from "@/features/owner/helpers";

export function MemberRow({
  member,
  phoneRevealed,
  onPress,
  onRevealPhone,
  testID,
}: {
  member: OrgMemberRecord;
  phoneRevealed: boolean;
  onPress: () => void;
  onRevealPhone: () => void;
  testID?: string;
}) {
  const name = member.user?.name ?? "Member";
  const email = member.user?.email ?? "No email";
  const phone = member.user?.phone ?? null;
  const photoUrl = member.user?.profilePhotoUrl ?? member.profile.profilePhotoUrl;
  const goal = member.user?.fitnessGoal ?? member.profile.fitnessGoal;

  return (
    <GlassCard testID={testID} variant="compact" pressable onPress={onPress} contentStyle={styles.content}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{memberInitials(name, email)}</Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.email}>
          {goal ? `${email} · ${goal}` : email}
        </Text>
        <View style={styles.phoneRow}>
          <Text numberOfLines={1} style={styles.phoneText}>
            {phoneRevealed ? (phone ?? "No phone") : redactPhone(phone)}
          </Text>
          {phone && !phoneRevealed ? (
            <Pressable
              onPress={onRevealPhone}
              accessibilityRole="button"
              accessibilityLabel={`Reveal phone for ${name}`}
              style={styles.revealButton}
            >
              <Text style={styles.revealText}>Reveal</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandLime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassFill,
  },
  avatarText: {
    color: colors.bgApp,
    ...typography.caption,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.textPrimary,
    ...typography.cardTitle,
  },
  email: {
    color: colors.textMuted,
    ...typography.small,
  },
  phoneRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  phoneText: {
    color: colors.textMuted,
    ...typography.small,
  },
  revealButton: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  revealText: {
    color: colors.brandLime,
    ...typography.caption,
  },
});
