import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, Pill, Screen } from "@/components/primitives";
import { useMyPlans } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Plans() {
  const plansQuery = useMyPlans();
  const plans = (plansQuery.data?.plans ?? []) as Array<{ id: string; audience?: string; planId?: string }>;

  return (
    <Screen title="Plans">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {plansQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading assigned plans...</Text>
          </Card>
        ) : null}
        {!plansQuery.isLoading && !plans.length ? (
          <Card>
            <Text style={styles.body}>No plans have been assigned yet.</Text>
          </Card>
        ) : null}
        {plans.map((plan) => (
          <Card key={plan.id}>
            <Pill tone="lime">Assigned</Pill>
            <Text style={styles.title} selectable>
              {plan.planId ?? "Plan assignment"}
            </Text>
            <Text style={styles.body} selectable>
              Audience: {plan.audience ?? "selected_member"}
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
