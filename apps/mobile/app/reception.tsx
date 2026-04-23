import { ScrollView, StyleSheet, Text } from "react-native";
import { Card, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

const tasks = ["Pending check-ins", "Live check-ins", "Member search", "Manual payment", "Shop pickup", "Operational notice"];

export default function Reception() {
  return (
    <Screen title="Reception">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {tasks.map((task) => (
          <Card key={task}>
            <Text style={styles.title} selectable>
              {task}
            </Text>
            <Text style={styles.body} selectable>
              Permission checked and audit logged in the API.
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
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 20, marginVertical: 12 }
});
