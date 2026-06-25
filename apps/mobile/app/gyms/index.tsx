import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  Card,
  IconBubble,
  AppHeader,
  Pill,
  Input,
  QueryErrorState,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { FindGymsSkeleton } from "@/components/skeletons";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { toWebUrl } from "@/lib/api";
import { joinModeLabel, joinModeTone, titleCaseFromCode } from "@/lib/formatting";
import { resolveAmenities } from "@/lib/amenity-catalog";
import { useI18n } from "@/lib/i18n";
import { useGymSearch } from "@/lib/domains";
import { useAuth } from "@/lib/auth";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

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
  const { logout, session } = useAuth();
  const { t } = useI18n();
  const { palette, mode } = useTheme();
  const chromeSurface = mode === "dark" ? palette.surface.default : palette.bg.elevated;
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

  function confirmSignOut() {
    Alert.alert(t("more.signOutConfirmTitle"), t("more.signOutConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("more.signOut"), style: "destructive", onPress: () => void logout() },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="find-gyms-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <AppHeader
            eyebrow={t("findGyms.discovery")}
            title={t("findGyms.title")}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel={t("shop.back")}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    borderColor: palette.border.subtle,
                    backgroundColor: chromeSurface,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
              </Pressable>
            }
            trailing={
              session ? (
                <Pressable
                  testID="find-gyms-sign-out"
                  onPress={confirmSignOut}
                  accessibilityRole="button"
                  accessibilityLabel={t("more.signOut")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: palette.border.subtle,
                      backgroundColor: chromeSurface,
                    },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Ionicons name="log-out-outline" size={20} color={palette.text.primary} />
                </Pressable>
              ) : undefined
            }
            showProfileShortcut={false}
          />

          {referralCode ? (
            <Card variant="compact" contentStyle={styles.referralCopy}>
              <Text style={[styles.referralTitle, { color: palette.text.primary }]}>
                {t("findGyms.referralApplied")}
              </Text>
              <Text style={[styles.referralBody, { color: palette.text.secondary }]}>
                {t("findGyms.referralPrefix")} <Text style={[styles.referralCode, { color: palette.accent.base }]}>{referralCode}</Text> {t("findGyms.referralSuffix")}
              </Text>
            </Card>
          ) : null}

          <Card contentStyle={styles.searchContent}>
            <Input
              testID="find-gyms-query"
              label={t("findGyms.gymNameOrUsername")}
              value={query}
              onChangeText={setQuery}
              placeholder={t("findGyms.searchPlaceholder")}
            />
            <Input
              testID="find-gyms-city"
              label={t("findGyms.city")}
              value={city}
              onChangeText={setCity}
              placeholder={t("findGyms.cityPlaceholder")}
            />
          </Card>

          <SectionHeader
            title={t("findGyms.availableGyms")}
            subtitle={
              gymsQuery.isFetching && !gyms.length
                ? t("findGyms.searching")
                : t(gyms.length === 1 ? "findGyms.resultCountOne" : "findGyms.resultCountMany", { count: gyms.length })
            }
          />

          {gymsQuery.isLoading ? (
            <FindGymsSkeleton />
          ) : null}

          {gymsQuery.isError ? (
            <QueryErrorState error={gymsQuery.error} onRetry={() => void gymsQuery.refetch()} />
          ) : null}

          {!gymsQuery.isLoading && !gymsQuery.isError && !gyms.length ? (
            <Card variant="compact" contentStyle={styles.emptyContent}>
              <View style={styles.emptyCopy}>
                <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>
                  {t("findGyms.noGyms")}
                </Text>
                <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
                  {t("findGyms.noGymsBody")}
                </Text>
              </View>
            </Card>
          ) : null}

          <View style={styles.results}>
            {gyms.map((gym, index) => (
              <Link
                key={gym.username}
                href={{
                  pathname: "/gyms/[username]",
                  params: {
                    username: gym.username,
                    ...(referralCode ? { ref: referralCode } : {}),
                  },
                }}
                asChild
              >
                <Pressable
                  testID={index === 0 ? "find-gym-row-first" : `find-gym-row-${gym.username}`}
                  accessibilityRole="link"
                  accessibilityLabel={t("findGyms.openGym", { name: gym.name })}
                  style={({ pressed }) => [pressed ? styles.pressed : null]}
                >
                  <Card contentStyle={styles.gymContent}>
                    <View style={styles.gymHeader}>
                      {gym.coverImageUrl ? (
                        <Image
                          source={{ uri: normalizeMediaUrl(gym.coverImageUrl) }}
                          style={[
                            styles.gymThumbnail,
                            {
                              backgroundColor: chromeSurface,
                            },
                          ]}
                          contentFit="cover"
                          accessibilityLabel={t("findGyms.coverPhoto", { name: gym.name })}
                        />
                      ) : (
                        <View
                          style={[
                            styles.gymThumbnailFallback,
                            { backgroundColor: palette.surface.accentSoft },
                          ]}
                        >
                          <IconBubble icon="business-outline" tone="neutral" size={34} />
                        </View>
                      )}
                      <View style={styles.gymCopy}>
                        <Text numberOfLines={2} style={[styles.gymTitle, { color: palette.text.primary }]}>
                          {gym.name}
                        </Text>
                        <Text numberOfLines={1} style={[styles.gymLocation, { color: palette.text.secondary }]}>
                          {gym.city}, {gym.state}
                        </Text>
                      </View>
                      <Pill tone={joinModeTone(gym.joinMode)}>
                        {joinModeLabel(gym.joinMode)}
                      </Pill>
                    </View>

                    {(() => {
                      const available = resolveAmenities(gym.amenities ?? []).available;
                      if (!available.length) return null;
                      return (
                        <View style={styles.amenityIcons}>
                          {available.slice(0, 5).map((item) => (
                            <View
                              key={item.key}
                              style={[styles.amenityChip, { backgroundColor: palette.surface.accentSoft }]}
                            >
                              <Ionicons name={item.icon} size={13} color={palette.accent.base} />
                              <Text style={[styles.amenityChipText, { color: palette.text.secondary }]} numberOfLines={1}>
                                {item.label}
                              </Text>
                            </View>
                          ))}
                          {available.length > 5 ? (
                            <Text style={[styles.amenityMore, { color: palette.text.tertiary }]}>
                              +{available.length - 5}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })()}

                    <View style={styles.gymFooter}>
                      <View style={styles.gymFooterLeft}>
                        <Ionicons name="eye-outline" size={13} color={palette.text.secondary} />
                        <Text style={[styles.gymFooterText, { color: palette.text.secondary }]}>
                          {titleCaseFromCode(gym.visibility ?? "PUBLIC")}
                        </Text>
                      </View>
                      <View style={styles.gymViewCta}>
                        <Text style={[styles.gymViewText, { color: palette.accent.base }]}>{t("findGyms.view")}</Text>
                        <Ionicons name="chevron-forward" size={14} color={palette.accent.base} />
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            ))}
          </View>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 20,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  referralCopy: {
    gap: 4,
  },
  referralTitle: {
    ...typography.cardTitle,
  },
  referralBody: {
    ...typography.body,
  },
  referralCode: {
    ...typography.bodyStrong,
  },
  searchContent: {
    gap: spacing.md,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
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
    ...typography.cardTitle,
  },
  emptyBody: {
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
  },
  gymThumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gymCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  gymTitle: {
    ...typography.headerTitle,
  },
  gymLocation: {
    ...typography.body,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagText: {
    ...typography.small,
  },
  amenityIcons: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 150,
  },
  amenityChipText: {
    ...typography.small,
  },
  amenityMore: {
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
    ...typography.small,
  },
  gymViewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  gymViewText: {
    ...typography.caption,
  },
});
