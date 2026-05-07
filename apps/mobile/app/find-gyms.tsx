import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import { FindGymsSkeleton } from "@/components/skeletons";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { toWebUrl } from "@/lib/api";
import { joinModeLabel, titleCaseFromCode } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { useGymSearch } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

function normalizeMediaUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function sanitizeReferralCode(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const cleaned = raw
    ?.replace(/[\u202a-\u202e\u2066-\u2069\r\n\t]/gi, "")
    .replace(/[^\w-]/g, "")
    .slice(0, 32);
  return cleaned || undefined;
}

export default function FindGyms() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const routeParams = useLocalSearchParams<{ focus?: string; ref?: string }>();
  const referralCode = sanitizeReferralCode(routeParams.ref);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState({ query: "", city: "" });
  const [refreshing, setRefreshing] = useState(false);
  const debouncedQuery = debouncedSearch.query.trim();
  const debouncedCity = debouncedSearch.city.trim();
  const gymsQuery = useGymSearch({
    query: debouncedQuery || undefined,
    city: debouncedCity || undefined,
  });
  const gyms = gymsQuery.data?.gyms ?? [];
  const locationChips = [
    { id: "device", label: t("findGyms.deviceLocation") },
    { id: "recent", label: t("findGyms.recentSearches") },
  ] as const;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch({ query: query.trim(), city: city.trim() });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [city, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["gyms"] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.lime}
                colors={[colors.lime]}
              />
            ),
          }}
        >
          <MobileHeader
            eyebrow="Discovery"
            title="Find your gym"
            subtitle="Browse public gyms and apply referral codes"
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
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

          <GlassCard contentStyle={styles.searchContent}>
            <GlassInput
              label="Gym name or username"
              value={query}
              onChangeText={setQuery}
              placeholder={t("findGyms.searchPlaceholder")}
            />
            <GlassInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder={t("findGyms.cityPlaceholder")}
            />
            <View style={styles.cityRow}>
              {locationChips.map((chip) => {
                const active = chip.id === "device" && city.trim() === "";
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setCity("")}
                    accessibilityRole="button"
                    style={[styles.cityChip, active ? styles.cityChipActive : null]}
                  >
                    <Text style={[styles.cityChipText, active ? styles.cityChipTextActive : null]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <SectionHeader
            title="Available gyms"
            subtitle={
              gymsQuery.isFetching && !gyms.length
                ? "Searching..."
                : `${gyms.length} result${gyms.length !== 1 ? "s" : ""}`
            }
          />

          {gymsQuery.isLoading ? (
            <FindGymsSkeleton />
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
