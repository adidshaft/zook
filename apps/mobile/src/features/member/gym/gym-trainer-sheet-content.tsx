import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { normalizeWebUrl } from "@/lib/api";
import { formatInitials } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import type { GymProfileData } from "@/lib/domains";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];

function normalizeSpecialties(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function GymTrainerSheetContent({ trainer }: { trainer: PublicTrainer | null }) {
  const { palette } = useTheme();
  const { t } = useI18n();

  if (!trainer) return null;

  const profilePhotoUri = trainer.profilePhotoUrl ? normalizeWebUrl(trainer.profilePhotoUrl) : null;

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        {profilePhotoUri ? (
          <Image
            source={{ uri: profilePhotoUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={profilePhotoUri}
            transition={150}
          />
        ) : (
          <View
            style={[
              styles.imageFallback,
              {
                backgroundColor: palette.surface.accentSoft,
                borderColor: palette.border.focus,
              },
            ]}
          >
            <Text style={[styles.imageText, { color: palette.accent.base }]}>
              {formatInitials(trainer.name, "T")}
            </Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={[styles.name, { color: palette.text.primary }]}>{trainer.name}</Text>
          <Text style={[styles.body, { color: palette.text.secondary }]}>
            {trainer.bio ?? t("gymProfile.noTrainerBioPublished")}
          </Text>
        </View>
      </View>
      <View style={styles.specialties}>
        {normalizeSpecialties(trainer.specialties).map((specialty) => (
          <Text
            key={`${trainer.userId}-sheet-${specialty}`}
            style={[styles.specialty, { color: palette.feedback.info }]}
          >
            {specialty}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 24,
  },
  imageFallback: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageText: {
    ...typography.headerTitle,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  name: {
    ...typography.headerTitle,
  },
  body: {
    ...typography.body,
  },
  specialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specialty: {
    ...typography.small,
  },
});
