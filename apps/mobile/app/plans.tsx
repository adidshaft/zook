import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, Pill, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

const plans = [
  ["Starter Strength Week", "Workout", "Day 2 ready · 50% complete"],
  ["Nutrition guidance", "Diet", "Protein, hydration, allergy warnings"],
  ["Machine-use guide", "Guide", "Reviewed by trainer"]
];

export default function Plans() {
  return (
    <Screen title="Plans">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {plans.map(([title, type, detail]) => (
          <Card key={title}>
            <Pill tone={type === "Diet" ? "amber" : "lime"}>{type}</Pill>
            <Text style={styles.title} selectable>
              {title}
            </Text>
            <Text style={styles.body} selectable>
              {detail}
            </Text>
          </Card>
        ))}
        <Card>
          <Text style={styles.title} selectable>
            AI plan assistant
          </Text>
          <Text style={styles.body} selectable>
            Text-only for members. Trainer-generated drafts require human review before publishing.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 14 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 }
});
