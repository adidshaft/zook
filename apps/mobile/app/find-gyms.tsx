import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryLink, Screen } from "@/components/primitives";
import { useGymSearch } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function FindGyms() {
  const gymsQuery = useGymSearch();
  const gyms = gymsQuery.data?.gyms ?? [];

  return (
    <Screen title="Find Gyms">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.title} selectable>
            Map/list search
          </Text>
          <Text style={styles.body} selectable>
            Mock maps show distance-sorted gyms without a Google Maps key. Real maps plug into the provider layer.
          </Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>Pune · Bengaluru · Nearby</Text>
          </View>
        </Card>
        {gymsQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading gyms...</Text>
          </Card>
        ) : null}
        {!gymsQuery.isLoading && !gyms.length ? (
          <Card>
            <Text style={styles.body}>No public gyms matched the current search.</Text>
          </Card>
        ) : null}
        {gyms.map((gym) => (
          <Card key={gym.username}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} selectable>
                  {gym.name}
                </Text>
                <Text style={styles.body} selectable>
                  {gym.city}, {gym.state}
                </Text>
                <View style={styles.tags}>
                  <Pill tone="lime">{gym.joinMode}</Pill>
                  <Pill>{gym.amenities[0]}</Pill>
                </View>
              </View>
              <PrimaryLink href="/plans">Open</PrimaryLink>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  tags: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  mapPlaceholder: {
    marginTop: 16,
    height: 180,
    borderRadius: 24,
    backgroundColor: "rgba(185,244,85,0.1)",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center"
  },
  mapText: { color: colors.lime, fontWeight: "900" }
});
