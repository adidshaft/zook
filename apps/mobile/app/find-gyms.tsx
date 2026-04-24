import { useDeferredValue, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  GlassInput,
  LoadingState,
  Pill,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { formatCompactNumber, titleCaseFromCode } from "@/lib/formatting";
import { useGymSearch } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

const featuredCities = ["Pune", "Bengaluru", "Mumbai", "Delhi"];

export default function FindGyms() {
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
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Public discovery"
          title="Find the right floor before you commit."
          subtitle="Search public gyms, compare join modes, and open the membership flow that matches how you want to start."
        />

        <Card style={styles.searchCard}>
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
                  style={[styles.cityChip, active ? styles.cityChipActive : null]}
                >
                  <Text style={[styles.cityChipText, active ? styles.cityChipTextActive : null]}>
                    {featuredCity}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.mapCard}>
          <View style={styles.mapGlow} />
          <Text style={styles.mapEyebrow} selectable>
            Search pulse
          </Text>
          <Text style={styles.mapTitle} selectable>
            {gymsQuery.isLoading
              ? "Scanning public gyms..."
              : `${formatCompactNumber(gyms.length)} gyms in view`}
          </Text>
          <Text style={styles.mapBody} selectable>
            {deferredQuery || deferredCity
              ? `Showing results for ${deferredQuery ? `"${deferredQuery}"` : "all gyms"}${deferredCity ? ` in ${deferredCity}` : ""}.`
              : "Start broad, then tighten by city to find a gym that matches your join preference and amenities."}
          </Text>
          <View style={styles.mapMarkers}>
            {featuredCities.map((featuredCity) => (
              <View key={featuredCity} style={styles.markerBubble}>
                <Text style={styles.markerText}>{featuredCity}</Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader
          eyebrow="Results"
          title="Available public gyms"
          subtitle="Open a gym profile to see membership plans, referral support, and whether approval is required."
        />

        {gymsQuery.isLoading ? (
          <LoadingState
            title="Loading gym list"
            body="Checking public organizations and current join settings."
          />
        ) : null}

        {!gymsQuery.isLoading && !gyms.length ? (
          <EmptyState
            title="No public gyms matched"
            body="Try widening the city, clearing the search, or checking a different neighborhood."
          />
        ) : null}

        <View style={styles.results}>
          {gyms.map((gym) => (
            <Card key={gym.username} style={styles.gymCard}>
              <View style={styles.gymHeader}>
                <View style={styles.gymCopy}>
                  <Text style={styles.gymTitle} selectable>
                    {gym.name}
                  </Text>
                  <Text style={styles.gymBody} selectable>
                    {gym.city}, {gym.state}
                  </Text>
                </View>
                <Pill tone={toneForJoinMode(gym.joinMode)}>{titleCaseFromCode(gym.joinMode)}</Pill>
              </View>
              <Text style={styles.gymBody} selectable>
                {gym.coverImageUrl
                  ? "Public cover and membership flow available."
                  : "Premium dark glass profile with live plan and referral state."}
              </Text>
              <View style={styles.tags}>
                {(gym.amenities ?? []).slice(0, 4).map((amenity) => (
                  <Pill key={amenity} tone="blue">
                    {amenity}
                  </Pill>
                ))}
              </View>
              <View style={styles.gymFooter}>
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipLabel}>Profile</Text>
                  <Text style={styles.metricChipValue}>
                    {titleCaseFromCode(gym.visibility ?? "PUBLIC")}
                  </Text>
                </View>
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipLabel}>Best for</Text>
                  <Text style={styles.metricChipValue}>
                    {gym.amenities?.[0] ?? "General fitness"}
                  </Text>
                </View>
              </View>
              <PrimaryLink
                href={{ pathname: "/gym/[username]", params: { username: gym.username } }}
              >
                Open gym profile
              </PrimaryLink>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function toneForJoinMode(joinMode?: string) {
  if (joinMode === "OPEN_JOIN") {
    return "lime" as const;
  }
  if (joinMode === "APPROVAL_REQUIRED") {
    return "amber" as const;
  }
  if (joinMode === "INVITE_ONLY") {
    return "violet" as const;
  }
  return "neutral" as const;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  searchCard: {
    gap: 14,
  },
  cityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cityChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cityChipActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.1)",
  },
  cityChipText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  cityChipTextActive: {
    color: colors.lime,
  },
  mapCard: {
    minHeight: 220,
    gap: 12,
    position: "relative",
  },
  mapGlow: {
    position: "absolute",
    right: -24,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(125,211,252,0.08)",
  },
  mapEyebrow: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mapTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  mapBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  mapMarkers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  markerBubble: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.18)",
    backgroundColor: "rgba(185,244,85,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markerText: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
  },
  results: {
    gap: 12,
  },
  gymCard: {
    gap: 14,
  },
  gymHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  gymCopy: {
    flex: 1,
    gap: 6,
  },
  gymTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  gymBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  gymFooter: {
    flexDirection: "row",
    gap: 10,
  },
  metricChip: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    gap: 6,
  },
  metricChipLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricChipValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
});
