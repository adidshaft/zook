import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { personalTrackingDashboard } from "@zook/core";
import { Card, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function TrackingEntry() {
  const entry = personalTrackingDashboard.todayLog;

  return (
    <>
      <Stack.Screen options={{ title: "Workout entry" }} />
      <Screen title="Workout entry">
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <Card style={styles.hero}>
            <Text style={styles.heroEyebrow} selectable>
              {entry.dateLabel}
            </Text>
            <Text style={styles.heroTitle} selectable>
              {entry.workoutName}
            </Text>
            <Text style={styles.heroBody} selectable>
              Save session timing, then add the exercises you completed after training.
            </Text>
          </Card>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel} selectable>
                Start
              </Text>
              <Text style={styles.metaValue} selectable>
                {entry.startTimeLabel}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel} selectable>
                End
              </Text>
              <Text style={styles.metaValue} selectable>
                {entry.endTimeLabel}
              </Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel} selectable>
                Duration
              </Text>
              <Text style={styles.metaValue} selectable>
                {entry.durationLabel}
              </Text>
            </View>
          </View>

          <Card style={styles.exerciseCard}>
            <Text style={styles.sectionTitle} selectable>
              Completed exercises
            </Text>
            {entry.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.exerciseName} selectable>
                    {exercise.name}
                  </Text>
                  <Text style={styles.exerciseMeta} selectable>
                    {exercise.setsLabel} · {exercise.repsLabel}
                    {exercise.loadLabel ? ` · ${exercise.loadLabel}` : ""}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText} selectable>
                    {exercise.status}
                  </Text>
                </View>
              </View>
            ))}
            <PrimaryButton>Add another exercise</PrimaryButton>
          </Card>

          <Card style={styles.notesCard}>
            <Text style={styles.sectionTitle} selectable>
              Notes
            </Text>
            <Text style={styles.notesBody} selectable>
              {entry.notes}
            </Text>
            <PrimaryButton>Save today's workout</PrimaryButton>
          </Card>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  hero: {
    gap: 10
  },
  heroEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 20
  },
  metaRow: {
    flexDirection: "row",
    gap: 12
  },
  metaCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: colors.paper,
    padding: 14,
    gap: 6
  },
  metaLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  metaValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  exerciseCard: {
    gap: 14
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  exerciseRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  exerciseMeta: {
    color: colors.muted,
    fontSize: 12
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(185,244,85,0.12)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.24)"
  },
  statusText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800"
  },
  notesCard: {
    gap: 14
  },
  notesBody: {
    color: colors.muted,
    lineHeight: 20
  }
});
