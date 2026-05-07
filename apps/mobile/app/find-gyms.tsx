import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDeferredValue, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  Pill,
  GlassInput,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { toWebUrl } from "@/lib/api";
import { joinModeLabel, titleCaseFromCode } from "@/lib/formatting";
import { useGymSearch } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

const featuredCities = ["Pune", "Bengaluru", "Mumbai", "Delhi"];

function normalizeMediaUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

export default function FindGyms() {
  const routeParams = useLocalSearchParams<{ focus?: string; ref?: string }>();
  const referralCode = Array.isArray(routeParams.ref) ? routeParams.ref[0] : routeParams.ref;
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const deferredCity = useDeferredValue(city.trim());
  const gymsQuery = useGymSearch({
    query: deferredQuery || undefined,
    city: deferredCity || undefined,
  });
  const gyms = gymsQuery.data?.gyms ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            eyebrow="Discovery"
            title="Find your gym"
            subtitle="Browse public gyms and apply referral codes"
          />

          {referralCode ? (
            <GlassCard variant="success" contentStyle={styles.referralContent}>
              <IconBubble icon="gift-outline" tone="lime" size={36} />
              <View style={styles.referralCopy}>
                <Text style={styles.referralTitle}>Referral code applied</Text>
                <Text style={styles.referralBody}>
                  Code <Text style={styles.referralCode}>{referralCode}</Text> is attached. Open any gym to use it.
                </Text>
              </View>
            </GlassCard>
          ) : null}

          {/* Search */}
          <GlassCard contentStyle={styles.searchContent}>
            <GlassInput
              label="Gym name or username"
              value={query}
              onChangeText={setQuery}
              placeholder="Try Iron House or peaklab"
            />
            <GlassInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Pune, Bengaluru, Mumbai..."
            />
            <View style={styles.cityRow}>
              {featuredCities.map((featuredCity) => {
                const active = city.trim().toLowerCase() === featuredCity.toLowerCase();
                return (
                  <Pressable
                    key={featuredCity}
                    onPress={() => setCity(active ? "" : featuredCity)}
                    accessibilityRole="button"
                    style={[styles.cityChip, active ? styles.cityChipActive : null]}
                  >
                    <Text style={[styles.cityChipText, active ? styles.cityChipTextActive : null]}>
                      {featuredCity}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Map placeholder */}
          <GlassCard variant="compact" contentStyle={styles.mapContent}>
            <View style={styles.mapGlow} />
            <Text style={styles.mapEyebrow}>MAP</Text>
            <Text style={styles.mapTitle}>Nearby gyms</Text>
            <Text style={styles.mapBody}>
              {gyms.length
                ? `${gyms.length} gym${gyms.length !== 1 ? "s" : ""} found in ${deferredCity || "all cities"}`
                : "Search to see results on the map."}
            </Text>
            {gyms.length > 0 ? (
              <View style={styles.mapMarkers}>
                {gyms.slice(0, 4).map((gym) => (
                  <View key={gym.username} style={styles.markerBubble}>
                    <Text style={styles.markerText}>{gym.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassCard>

          {/* Results */}
          <SectionHeader
            title="Available gyms"
            subtitle={gymsQuery.isLoading ? "Searching..." : `${gyms.length} result${gyms.length !== 1 ? "s" : ""}`}
          />

          {gymsQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <IconBubble icon="hourglass-outline" tone="amber" size={36} />
              <Text style={styles.loadingText}>Searching public gyms...</Text>
            </GlassCard>
          ) : null}

          {!gymsQuery.isLoading && !gyms.length ? (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="search-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No gyms found</Text>
                <Text style={styles.emptyBody}>Try widening the city or clearing the search.</Text>
              </View>
            </GlassCard>
          ) : null}

          <View style={styles.results}>
            {gyms.map((gym) => (
              <Link
                key={gym.username}
                href={{
                  pathname: "/gym/[username]",
                  params: {
                    username: gym.username,
                    ...(referralCode ? { ref: referralCode } : {}),
                  },
                }}
                asChild
              >
                <Pressable accessibilityRole="link" style={({ pressed }) => [pressed ? styles.pressed : null]}>
                  <GlassCard contentStyle={styles.gymContent}>
                    <View style={styles.gymHeader}>
                      {gym.coverImageUrl ? (
                        <Image
                          source={{ uri: normalizeMediaUrl(gym.coverImageUrl) }}
                          style={styles.gymThumbnail}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.gymThumbnailFallback}>
                          <IconBubble icon="business-outline" tone="lime" size={34} />
                        </View>
                      )}
                      <View style={styles.gymCopy}>
                        <Text numberOfLines={1} style={styles.gymTitle}>
                          {gym.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.gymLocation}>
                          {gym.city}, {gym.state}
                        </Text>
                      </View>
                      <Pill tone={toneForJoinMode(gym.joinMode)}>
                        {joinModeLabel(gym.joinMode)}
                      </Pill>
                    </View>

                    {(gym.amenities ?? []).length > 0 ? (
                      <View style={styles.tags}>
                        {(gym.amenities ?? []).slice(0, 4).map((amenity) => (
                          <Text key={amenity} style={styles.tagText}>
                            {amenity}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.gymFooter}>
                      <View style={styles.gymFooterLeft}>
                        <Ionicons name="eye-outline" size={13} color={colors.muted} />
                        <Text style={styles.gymFooterText}>
                          {titleCaseFromCode(gym.visibility ?? "PUBLIC")}
                        </Text>
                      </View>
                      <View style={styles.gymViewCta}>
                        <Text style={styles.gymViewText}>View</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.lime} />
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              </Link>
            ))}
          </View>
        </KeyboardAwareScreen>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function toneForJoinMode(joinMode?: string) {
  if (joinMode === "OPEN_JOIN") return "lime" as const;
  if (joinMode === "APPROVAL_REQUIRED") return "amber" as const;
  if (joinMode === "INVITE_ONLY") return "violet" as const;
  return "neutral" as const;
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  referralContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  referralCopy: {
    flex: 1,
    gap: 4,
  },
  referralTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  referralBody: {
    color: colors.muted,
    ...typography.body,
  },
  referralCode: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
  searchContent: {
    gap: spacing.md,
  },
  cityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cityChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cityChipActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.1)",
  },
  cityChipText: {
    color: colors.text,
    ...typography.caption,
  },
  cityChipTextActive: {
    color: colors.lime,
  },
  mapContent: {
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  mapGlow: {
    position: "absolute",
    right: -24,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(125,211,252,0.06)",
  },
  mapEyebrow: {
    color: colors.blue,
    ...typography.eyebrow,
  },
  mapTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  mapBody: {
    color: colors.muted,
    ...typography.body,
  },
  mapMarkers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  markerBubble: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.18)",
    backgroundColor: "rgba(185,244,85,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markerText: {
    color: colors.lime,
    ...typography.small,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    ...typography.body,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  results: {
    gap: 10,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  gymContent: {
    gap: spacing.md,
  },
  gymHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  gymThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  gymThumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(185,244,85,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  gymCopy: {
    flex: 1,
    gap: 4,
  },
  gymTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  gymLocation: {
    color: colors.muted,
    ...typography.body,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagText: {
    color: colors.muted,
    ...typography.small,
  },
  gymFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gymFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gymFooterText: {
    color: colors.muted,
    ...typography.small,
  },
  gymViewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  gymViewText: {
    color: colors.lime,
    ...typography.caption,
  },
});
