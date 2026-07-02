import { Image } from "expo-image";
import type { ImageSourcePropType } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AmenityGrid } from "@/components/domain/amenity-grid";
import { Card, EmptyState, SectionHeader } from "@/components/primitives";
import { normalizeWebUrl } from "@/lib/api";
import { formatInitials } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import type { GymProfileData } from "@/lib/domains";

type PublicTrainer = NonNullable<GymProfileData["trainers"]>[number];
type GymProfileOrg = NonNullable<GymProfileData["org"]>;

function normalizeSpecialties(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function GymOverviewSection({
  gallery,
  gym,
  imageSource,
  trainers,
  onOpenGallery,
  onOpenTrainer,
}: {
  gallery: string[];
  gym: Pick<GymProfileOrg, "amenities" | "equipment" | "gymType">;
  imageSource: (value?: string | null) => ImageSourcePropType | { uri: string } | null;
  trainers: PublicTrainer[];
  onOpenGallery: (index: number) => void;
  onOpenTrainer: (trainer: PublicTrainer) => void;
}) {
  const { palette } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <SectionHeader eyebrow={t("gymProfile.atAGlance")} title={t("gymProfile.whatsInside")} />
      <Card contentStyle={styles.amenityCard}>
        <AmenityGrid sources={[...(gym.amenities ?? []), ...(gym.equipment ?? []), gym.gymType]} />
      </Card>

      {gallery.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
          {gallery.map((imageUrl, index) => (
            <Pressable
              key={`${imageUrl}-${index}`}
              accessibilityRole="imagebutton"
              accessibilityLabel={t("gymProfile.photoOf", {
                index: index + 1,
                count: gallery.length,
              })}
              onPress={() => onOpenGallery(index)}
              style={({ pressed }) => (pressed ? { opacity: 0.88 } : null)}
            >
              <Image
                source={imageSource(imageUrl)}
                style={styles.galleryImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={`gallery-${imageUrl}`}
                transition={150}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <SectionHeader eyebrow={t("gymProfile.coaches")} title={t("gymProfile.trainerTeam")} />

      <View style={styles.trainerStack}>
        {trainers.length ? (
          trainers
            .filter((trainer) => trainer.visibleToMembers !== false)
            .map((trainer) => (
              <Pressable
                key={trainer.userId}
                onPress={() => onOpenTrainer(trainer)}
                accessibilityRole="button"
                accessibilityLabel={t("gymProfile.openTrainerProfile", { name: trainer.name })}
                style={({ pressed }) => (pressed ? styles.cardPressed : null)}
              >
                <Card contentStyle={styles.trainerCard}>
                  {trainer.profilePhotoUrl ? (
                    <Image
                      source={{ uri: normalizeWebUrl(trainer.profilePhotoUrl) }}
                      style={styles.trainerImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      recyclingKey={`trainer-${trainer.userId}`}
                      transition={150}
                    />
                  ) : (
                    <View
                      style={[
                        styles.trainerImageFallback,
                        {
                          backgroundColor: palette.surface.accentSoft,
                          borderColor: palette.border.focus,
                        },
                      ]}
                    >
                      <Text style={[styles.trainerImageText, { color: palette.accent.base }]}>
                        {formatInitials(trainer.name, "T")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.trainerCopy}>
                    <Text style={[styles.trainerName, { color: palette.text.primary }]}>
                      {trainer.name}
                    </Text>
                    <Text style={[styles.sectionBody, { color: palette.text.secondary }]} numberOfLines={2}>
                      {trainer.bio ?? t("gymProfile.noBioAdded")}
                    </Text>
                    <View style={styles.trainerSpecialties}>
                      {normalizeSpecialties(trainer.specialties)
                        .slice(0, 3)
                        .map((specialty) => (
                          <Text
                            key={`${trainer.userId}-${specialty}`}
                            style={[styles.trainerSpecialty, { color: palette.feedback.info }]}
                          >
                            {specialty}
                          </Text>
                        ))}
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
        ) : (
          <EmptyState title={t("gymProfile.noPublicTrainerProfiles")} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  amenityCard: {
    gap: 10,
  },
  galleryRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  galleryImage: {
    width: 210,
    height: 126,
    borderRadius: 20,
  },
  trainerStack: {
    gap: spacing.md,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.992 }],
  },
  trainerCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  trainerImage: {
    width: 64,
    height: 64,
    borderRadius: 22,
  },
  trainerImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trainerImageText: {
    ...typography.headerTitle,
  },
  trainerCopy: {
    flex: 1,
    gap: 6,
  },
  trainerName: {
    ...typography.headerTitle,
  },
  trainerSpecialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trainerSpecialty: {
    ...typography.small,
  },
  sectionBody: {
    ...typography.body,
  },
});
