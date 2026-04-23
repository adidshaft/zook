import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, Pill, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

const ownerCards = [
  ["Today attendance", "84", "Check-ins and pending approvals"],
  ["Active members", "642", "Expiring: 39"],
  ["Cash collected", "₹18.4k", "By staff and mode"],
  ["AI usage", "42", "Org pool guarded"]
];

export default function Owner() {
  return (
    <Screen title="Owner">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Pill tone="lime">Trial active</Pill>
          <Text style={styles.title} selectable>
            Owner command center
          </Text>
          <Text style={styles.body} selectable>
            Manage staff, permissions, plans, coupons, referrals, reports, shop, AI, billing, privacy, and public profile.
          </Text>
        </Card>
        {ownerCards.map(([label, value, detail]) => (
          <Card key={label}>
            <Text style={styles.body} selectable>
              {label}
            </Text>
            <Text style={styles.metric} selectable>
              {value}
            </Text>
            <Text style={styles.body} selectable>
              {detail}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 12 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metric: { color: colors.lime, fontSize: 38, fontWeight: "900", marginTop: 8 }
});
