import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  type ImageSourcePropType,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  Card,
  ScreenHeader,
  Pill,
  Input,
  QueryErrorState,
  SectionHeader,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import { FindGymsSkeleton } from "@/components/skeletons";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { toWebUrl } from "@/lib/api";
import { formatGymHeaderIdentity, formatInitials, joinModeTone } from "@/lib/formatting";
import { resolveAmenities } from "@/lib/amenity-catalog";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import { useI18n } from "@/lib/i18n";
import { useGymCities, useGymSearch } from "@/lib/domains";
import { useAuth } from "@/lib/auth";
import { fixedSurfaces, layout, radii, spacing, typography, useTheme } from "@/lib/theme";
import aarogyaCoverSource from "../../../web/public/seed/gyms/aarogya-strength/cover.png";

const AAROGYA_COVER_SOURCE = aarogyaCoverSource as ImageSourcePropType;

function normalizeMediaUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function normalizeLogoUrl(value?: string | null) {
  return seededGymLogoDataUri(value) ?? normalizeMediaUrl(value);
}

function resolveGymCoverSource(username?: string | null, coverImageUrl?: string | null) {
  if (username === "aarogya-strength") {
    return AAROGYA_COVER_SOURCE;
  }
  const normalized = normalizeMediaUrl(coverImageUrl);
  return normalized ? { uri: normalized } : null;
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
  const { confirm, sheet } = useConfirmSheet();
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
  const citiesQuery = useGymCities();
  const gyms = useMemo(() => gymsQuery.data?.gyms ?? [], [gymsQuery.data?.gyms]);
  const showResultCount = !gymsQuery.isError;
  const showResults = !gymsQuery.isLoading && !gymsQuery.isError && gyms.length > 0;
  const showSearchingInline = gymsQuery.isFetching && !gyms.length && !gymsQuery.isError;
  const citySuggestions = useMemo(() => {
    const values = citiesQuery.data?.cities ?? [];
    return Array.from(new Set(values)).slice(0, 4);
  }, [citiesQuery.data?.cities]);

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
    confirm({
      title: t("more.signOutConfirmTitle"),
      body: t("more.signOutConfirmBody"),
      destructiveLabel: t("more.signOut"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void logout(),
    });
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
          <ScreenHeader
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

          <View style={styles.searchContent}>
            <Input
              testID="find-gyms-query"
              accessibilityLabel={t("findGyms.searchLabel")}
              value={query}
              onChangeText={setQuery}
              placeholder={t("findGyms.searchPlaceholder")}
              leading={<Ionicons name="search-outline" size={17} color={palette.text.tertiary} />}
              style={styles.compactInput}
              inputWrapperStyle={styles.compactInputWrapper}
              inputStyle={styles.compactInputText}
              numberOfLines={1}
            />
            {citySuggestions.length || city ? (
              <View style={styles.cityChips}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("findGyms.allAreas")}
                  onPress={() => setCity("")}
                  style={({ pressed }) => [
                    styles.cityChip,
                    {
                      backgroundColor: !city ? palette.accent.base : palette.bg.sunken,
                      borderColor: !city ? palette.accent.base : palette.border.subtle,
                    },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={[styles.cityChipText, { color: !city ? palette.text.onAccent : palette.text.secondary }]}>
                    {t("findGyms.allAreas")}
                  </Text>
                </Pressable>
                {citySuggestions.map((suggestion) => {
                  const selected = city.trim().toLowerCase() === suggestion.toLowerCase();
                  return (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      accessibilityLabel={suggestion}
                      onPress={() => setCity(selected ? "" : suggestion)}
                      style={({ pressed }) => [
                        styles.cityChip,
                        {
                          backgroundColor: selected ? palette.accent.base : palette.bg.sunken,
                          borderColor: selected ? palette.accent.base : palette.border.subtle,
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={[styles.cityChipText, { color: selected ? palette.text.onAccent : palette.text.secondary }]}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {!gymsQuery.isError ? (
            <SectionHeader
              title={t("findGyms.availableGyms")}
              subtitle={
                !showResultCount
                  ? undefined
                  : showSearchingInline
                    ? undefined
                    : t(gyms.length === 1 ? "findGyms.resultCountOne" : "findGyms.resultCountMany", { count: gyms.length })
              }
              action={
                showSearchingInline ? (
                  <View style={[styles.inlineStatus, { backgroundColor: palette.bg.sunken }]}>
                    <View style={[styles.inlineStatusDot, { backgroundColor: palette.accent.base }]} />
                    <Text style={[styles.inlineStatusText, { color: palette.text.secondary }]}>
                      {t("findGyms.searching")}
                    </Text>
                  </View>
                ) : undefined
              }
            />
          ) : null}

          {gymsQuery.isLoading ? (
            <FindGymsSkeleton />
          ) : null}

          {gymsQuery.isError ? (
            <QueryErrorState
              error={gymsQuery.error}
              onRetry={() => void gymsQuery.refetch()}
              title={t("findGyms.loadError")}
            />
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

          {showResults ? (
            <View style={styles.results}>
              {gyms.map((gym, index) => {
                const brand = gymBrandColor(gym.name);
                const identity = formatGymHeaderIdentity({
                  address: gym.address,
                  city: gym.city,
                  orgName: gym.name,
                });
                const locationLine = identity.subtitle ?? [gym.city, gym.state].filter(Boolean).join(", ");
                const coverSource = resolveGymCoverSource(gym.username, gym.coverImageUrl);
                return (
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
                  <Card padding={0} contentStyle={styles.gymContent}>
                    <View style={styles.gymBrandCover}>
                      {coverSource ? (
                        <Image
                          source={coverSource}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          recyclingKey={`gym-cover-${gym.id}`}
                          transition={150}
                          accessibilityLabel={t("findGyms.coverPhoto", { name: gym.name })}
                        />
                      ) : (
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            styles.gymCoverFallback,
                            { backgroundColor: brand.soft },
                          ]}
                        >
                          <Text style={[styles.fallbackInitial, { color: brand.solid }]}>
                            {formatInitials(gym.name, brand.initial)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.coverScrim} />
                      <View style={styles.gymBrandOverlay}>
                        <View style={[styles.gymInitialMark, { backgroundColor: brand.soft, borderColor: `${brand.solid}88` }]}>
                          {normalizeLogoUrl(gym.logoUrl) ? (
                            <Image
                              source={{ uri: normalizeLogoUrl(gym.logoUrl) }}
                              style={styles.gymLogoImage}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              recyclingKey={`gym-logo-${gym.id}`}
                              transition={150}
                              accessibilityLabel={t("findGyms.logo", { name: gym.name })}
                            />
                          ) : (
                            <Text style={[styles.gymInitialText, { color: brand.solid }]}>
                              {formatInitials(gym.name, "Z")}
                            </Text>
                          )}
                        </View>
                        <View style={styles.gymOverlayCopy}>
                          <Text
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.86}
                            style={styles.gymTitleOnCover}
                          >
                            {identity.title}
                          </Text>
                          {locationLine ? (
                            <Text numberOfLines={1} style={styles.gymLocationOnCover}>
                              {locationLine}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.gymMetaRow}>
                      <Pill tone={joinModeTone(gym.joinMode)}>{localizedJoinModeLabel(gym.joinMode, t)}</Pill>
                      <View style={[styles.gymOpenCue, { backgroundColor: palette.surface.accentSoft }]}>
                        <Text style={[styles.gymOpenCueText, { color: palette.accent.base }]}>
                          {t("findGyms.view")}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={palette.accent.base} />
                      </View>
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
                              {t("common.plusCount", { count: available.length - 5 })}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })()}

                  </Card>
                </Pressable>
              </Link>
                );
              })}
            </View>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
      {sheet}
    </>
  );
}

function localizedJoinModeLabel(mode: string, t: ReturnType<typeof useI18n>["t"]) {
  if (mode === "OPEN_JOIN") return t("gymProfile.joinModeOpen");
  if (mode === "APPROVAL_REQUIRED") return t("gymProfile.joinModeApproval");
  if (mode === "INVITE_ONLY") return t("gymProfile.joinModeInvite");
  return mode;
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 8,
    gap: 10,
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
    gap: 8,
  },
  compactInput: {
    gap: 0,
  },
  compactInputWrapper: {
    minHeight: 46,
    borderRadius: 17,
    paddingHorizontal: 13,
  },
  compactInputText: {
    minHeight: 38,
    paddingVertical: 6,
  },
  cityChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cityChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  cityChipText: {
    ...typography.small,
    fontWeight: "700",
  },
  inlineStatus: {
    alignItems: "center",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 26,
    paddingHorizontal: 9,
  },
  inlineStatusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  inlineStatusText: {
    ...typography.caption,
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
    gap: 10,
    overflow: "hidden",
  },
  gymBrandCover: {
    height: 134,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 14,
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  gymCoverFallback: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 30,
  },
  fallbackInitial: {
    ...typography.timer,
    fontWeight: "900",
    letterSpacing: 0,
    opacity: 0.34,
  },
  gymBrandOverlay: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
  },
  gymInitialMark: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
    width: 50,
  },
  gymLogoImage: {
    height: "100%",
    width: "100%",
  },
  gymInitialText: {
    ...typography.sectionTitle,
    fontWeight: "900",
    letterSpacing: 0,
  },
  gymOverlayCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  gymTitleOnCover: {
    color: fixedSurfaces.onImagePrimary,
    ...typography.headerTitle,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gymLocationOnCover: {
    color: "rgba(255,255,255,0.78)",
    ...typography.small,
    fontWeight: "700",
    lineHeight: 16,
  },
  gymMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 2,
  },
  gymOpenCue: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    gap: 2,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  gymOpenCueText: {
    ...typography.caption,
    fontWeight: "800",
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
});
