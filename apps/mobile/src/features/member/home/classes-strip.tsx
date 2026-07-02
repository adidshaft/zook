import { useRouter } from "expo-router";
import { LinearGradient } from "@/components/primitives/linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconBubble, SectionHeader } from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { Ionicons } from "@expo/vector-icons";
import { useMyClasses } from "@/lib/domains";
import type { MemberClassRecord } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";
import {
  classDayTime,
  classTypeGradient,
  classTypeVisual,
} from "@/features/member/classes/class-display";

function spotPill(entry: MemberClassRecord, t: ReturnType<typeof useT>) {
  if (entry.myEnrollmentStatus === "confirmed") return { label: t("member.home.classBooked"), tone: "lime" as const };
  if (entry.myEnrollmentStatus === "pending_payment")
    return { label: t("member.classes.paymentDue"), tone: "amber" as const };
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: t("member.home.classWaitlisted"), tone: "amber" as const };
  if (entry.remainingCapacity <= 0) return { label: t("member.home.classFull"), tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return { label: t("member.home.classSpotsLeft", { count: entry.remainingCapacity }), tone: "amber" as const };
  return { label: t("member.home.classOpen"), tone: "neutral" as const };
}

function homeClassPriority(entry: MemberClassRecord) {
  if (entry.myEnrollmentStatus === "confirmed") return 0;
  if (entry.myEnrollmentStatus === "pending_payment") return 1;
  if (entry.myEnrollmentStatus === "waitlisted") return 2;
  if (entry.remainingCapacity > 0 && entry.remainingCapacity <= 3) return 3;
  if (entry.remainingCapacity <= 0) return 5;
  return 4;
}

function classStartMs(entry: MemberClassRecord) {
  const timestamp = new Date(entry.startTime).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function statusIcon(tone: ReturnType<typeof spotPill>["tone"]): keyof typeof Ionicons.glyphMap {
  if (tone === "red") return "lock-closed-outline";
  if (tone === "amber") return "time-outline";
  if (tone === "lime") return "checkmark";
  return "flash-outline";
}

function ClassChip({
  entry,
  onPress,
  compact = false,
}: {
  entry: MemberClassRecord;
  onPress: () => void;
  compact?: boolean;
}) {
  const { palette, mode } = useTheme();
  const t = useT();
  const visual = classTypeVisual(entry.classType);
  const pill = spotPill(entry, t);
  const statusTone = getTonePalette(pill.tone, mode, palette);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${classDayTime(entry.startTime, t)}, ${pill.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.compactCard : styles.card,
        { borderColor: palette.border.subtle, backgroundColor: palette.surface.default },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <LinearGradient
        colors={classTypeGradient(entry.classType, mode)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.cardContent, compact ? styles.compactCardContent : null]}>
        <View style={styles.cardTop}>
          <IconBubble icon={visual.icon} tone={visual.tone} size={compact ? 32 : 38} />
          <View
            style={[
              styles.statusMark,
              {
                borderColor: statusTone.borderColor,
                backgroundColor: statusTone.backgroundColor,
              },
            ]}
          >
            <Ionicons name={statusIcon(pill.tone)} size={13} color={statusTone.color} />
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text.primary }]}>
          {entry.name}
        </Text>
        <Text numberOfLines={1} style={[styles.cardMeta, { color: palette.text.secondary }]}>
          {classDayTime(entry.startTime, t)}
        </Text>
      </View>
    </Pressable>
  );
}

export function ClassesStrip({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const classesQuery = useMyClasses();
  const classes = (classesQuery.data?.classes ?? []).filter((entry) => entry.status !== "CANCELLED");

  // Don't draw the section until there is something to book.
  if (!classes.length) return null;

  const upcoming = [...classes]
    .sort((left, right) => {
      const priority = homeClassPriority(left) - homeClassPriority(right);
      return priority || classStartMs(left) - classStartMs(right);
    })
    .slice(0, 6);

  return (
    <View>
      {compact ? (
        <View style={styles.compactHeader}>
          <Text style={[styles.compactTitle, { color: palette.text.primary }]}>{t("member.home.upcomingClasses")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("member.home.seeAllClasses")}
            hitSlop={8}
            onPress={() => router.push("/classes" as never)}
            style={({ pressed }) => [styles.seeAll, pressed ? styles.seeAllPressed : null]}
          >
            <Text style={[styles.seeAllText, { color: palette.accent.base }]}>{t("member.home.seeAll")}</Text>
            <Ionicons name="chevron-forward" size={14} color={palette.accent.base} />
          </Pressable>
        </View>
      ) : (
        <SectionHeader
          title={t("member.home.upcomingClasses")}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("member.home.seeAllClasses")}
              hitSlop={8}
              onPress={() => router.push("/classes" as never)}
              style={({ pressed }) => [styles.seeAll, pressed ? styles.seeAllPressed : null]}
            >
              <Text style={[styles.seeAllText, { color: palette.accent.base }]}>{t("member.home.seeAll")}</Text>
              <Ionicons name="chevron-forward" size={14} color={palette.accent.base} />
            </Pressable>
          }
        />
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {upcoming.map((entry) => (
          <ClassChip
            key={entry.id}
            entry={entry}
            compact={compact}
            onPress={() => router.push(`/classes/${entry.id}` as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  card: {
    width: 154,
    borderRadius: radii.smallCard,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  compactCard: {
    width: 136,
    borderRadius: radii.smallCard,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  cardContent: {
    minHeight: 96,
    gap: 6,
    padding: 10,
  },
  compactCardContent: {
    minHeight: 76,
    padding: 8,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusMark: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  cardTitle: {
    ...typography.bodyStrong,
  },
  cardMeta: {
    ...typography.small,
  },
  compactHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compactTitle: {
    ...typography.small,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  seeAllPressed: {
    opacity: 0.7,
  },
  seeAllText: {
    ...typography.small,
    fontFamily: "Inter_600SemiBold",
  },
});
