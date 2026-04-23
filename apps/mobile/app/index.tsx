import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { dashboardMetrics, demoGyms } from "@zook/core";
import { Card, Dock, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function Home() {
  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted} selectable>
              Current gym
            </Text>
            <Text style={styles.gymName} selectable>
              Iron House Fitness
            </Text>
          </View>
          <Pill tone="lime">Active</Pill>
        </View>

        <Card style={styles.hero}>
          <Text style={styles.heroEyebrow} selectable>
            Member home
          </Text>
          <Text style={styles.heroTitle} selectable>
            Ready for today?
          </Text>
          <Link href="/scan" asChild>
            <PrimaryButton>Scan QR</PrimaryButton>
          </Link>
        </Card>

        <View style={styles.grid}>
          <Card style={styles.half}>
            <Text style={styles.muted} selectable>
              Active membership
            </Text>
            <Text style={styles.cardTitle} selectable>
              Monthly Unlimited
            </Text>
            <Text style={styles.detail} selectable>
              Expires in 25 days
            </Text>
          </Card>
          <Card style={styles.half}>
            <Text style={styles.muted} selectable>
              Weekly consistency
            </Text>
            <Text style={styles.metric} selectable>
              4/5
            </Text>
            <Text style={styles.detail} selectable>
              7-day streak target
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={styles.cardTitle} selectable>
            Today&apos;s goal
          </Text>
          <Text style={styles.detail} selectable>
            Starter Strength Week: Day 2, hydration, and sleep reminder.
          </Text>
        </Card>

        <Card>
          <View style={styles.row}>
            <View>
              <Text style={styles.cardTitle} selectable>
                Nearby gyms
              </Text>
              <Text style={styles.detail} selectable>
                {demoGyms.map((gym) => gym.city).join(" · ")}
              </Text>
            </View>
            <Link href="/find-gyms" asChild>
              <PrimaryButton>Find</PrimaryButton>
            </Link>
          </View>
        </Card>

        <View style={styles.metrics}>
          {dashboardMetrics.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <Text style={styles.muted} selectable>
                {metric.label}
              </Text>
              <Text style={styles.metricSmall} selectable>
                {metric.value}
              </Text>
            </Card>
          ))}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 120
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 20
  },
  muted: {
    color: colors.muted,
    fontSize: 12
  },
  gymName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18
  },
  hero: {
    gap: 16,
    minHeight: 210,
    justifyContent: "space-between"
  },
  heroEyebrow: {
    color: colors.amber,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 44
  },
  grid: {
    flexDirection: "row",
    gap: 12
  },
  half: {
    flex: 1
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  detail: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20
  },
  metric: {
    color: colors.lime,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 8
  },
  metricSmall: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  metrics: {
    gap: 12
  },
  metricCard: {
    minHeight: 92
  }
});
