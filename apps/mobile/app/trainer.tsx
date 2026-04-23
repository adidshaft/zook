import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

const tasks = ["Assigned clients", "Today sessions", "Record PT subscription", "Create plan", "AI plan assistant", "Send notification"];

export default function Trainer() {
  return (
    <Screen title="Trainer">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Pill tone="lime">Image quota enabled</Pill>
          <Text style={styles.title} selectable>
            Kabir Trainer
          </Text>
          <Text style={styles.body} selectable>
            Publish workout and nutrition guidance only to assigned clients unless owner grants broader permissions.
          </Text>
        </Card>
        {tasks.map((task) => (
          <Card key={task}>
            <Text style={styles.title} selectable>
              {task}
            </Text>
            <Text style={styles.body} selectable>
              Offline PT payments, draft-first AI, reviewed plan publishing, and scoped notifications.
            </Text>
            <PrimaryButton>Open</PrimaryButton>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  body: { color: colors.muted, lineHeight: 20, marginVertical: 12 }
});
