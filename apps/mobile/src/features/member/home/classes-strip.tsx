import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconBubble, Pill, SectionHeader } from "@/components/primitives";
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
  if (entry.myEnrollmentStatus === "waitlisted")
    return { label: t("member.home.classWaitlisted"), tone: "amber" as const };
  if (entry.remainingCapacity <= 0) return { label: t("member.home.classFull"), tone: "red" as const };
  if (entry.remainingCapacity <= 3)
    return { label: t("member.home.classSpotsLeft", { count: entry.remainingCapacity }), tone: "amber" as const };
  return { label: t("member.home.classOpen"), tone: "neutral" as const };
}

function ClassChip({ entry, onPress }: { entry: MemberClassRecord; onPress: () => void }) {
  const { palette, mode } = useTheme();
  const t = useT();
  const visual = classTypeVisual(entry.classType);
  const pill = spotPill(entry, t);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${classDayTime(entry.startTime)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
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
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <IconBubble icon={visual.icon} tone={visual.tone} size={38} />
          <Pill tone={pill.tone}>{pill.label}</Pill>
        </View>
        <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text.primary }]}>
          {entry.name}
        </Text>
        <Text numberOfLines={1} style={[styles.cardMeta, { color: palette.text.secondary }]}>
          {classDayTime(entry.startTime)}
        </Text>
        {entry.trainerName ? (
          <Text numberOfLines={1} style={[styles.cardMeta, { color: palette.text.tertiary }]}>
            {t("member.home.coachName", { name: entry.trainerName })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ClassesStrip() {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const classesQuery = useMyClasses();
  const classes = (classesQuery.data?.classes ?? []).filter((entry) => entry.status !== "CANCELLED");

  // Don't draw the section until there is something to book.
  if (!classes.length) return null;

  const upcoming = classes.slice(0, 6);

  return (
    <View>
      <SectionHeader
        title={t("member.home.bookClass")}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {upcoming.map((entry) => (
          <ClassChip
            key={entry.id}
            entry={entry}
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
    width: 172,
    borderRadius: radii.smallCard,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
  },
  cardContent: {
    gap: 6,
    padding: 14,
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
  cardTitle: {
    ...typography.cardTitle,
  },
  cardMeta: {
    ...typography.small,
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
