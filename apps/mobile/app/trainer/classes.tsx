import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  DatePickerField,
  EmptyState,
  FormField,
  IconBubble,
  Pill,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useMyClasses } from "@/lib/domains";
import { useCreateClass } from "@/lib/domains/trainer/queries";
import { classDayHeading, classTypeVisual } from "@/features/member/classes/class-display";
import { formatTime } from "@/lib/formatting";
import { radii, spacing, typography, layout, useTheme } from "@/lib/theme";

const CLASS_TYPES = ["HIIT", "Strength", "Yoga", "Cycling", "Dance", "Boxing", "Mobility"];
const TIME_SLOTS = [
  { label: "7:00 AM", hour: 7 },
  { label: "9:30 AM", hour: 9, minute: 30 },
  { label: "12:00 PM", hour: 12 },
  { label: "6:00 PM", hour: 18 },
  { label: "7:00 PM", hour: 19 },
  { label: "8:00 PM", hour: 20 },
];

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function TrainerClasses() {
  const { palette } = useTheme();
  const classesQuery = useMyClasses();
  const createClass = useCreateClass();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [classType, setClassType] = useState("Strength");
  const [capacity, setCapacity] = useState("16");
  const [date, setDate] = useState<Date>(tomorrow());
  const [slot, setSlot] = useState(TIME_SLOTS[3]);

  const classes = classesQuery.data?.classes ?? [];
  const canSubmit = name.trim().length >= 2 && (Number.parseInt(capacity, 10) || 0) > 0 && !createClass.isPending;

  async function refresh() {
    setRefreshing(true);
    await classesQuery.refetch();
    setRefreshing(false);
  }

  function submit() {
    if (!canSubmit) return;
    const start = new Date(date);
    start.setHours(slot.hour, slot.minute ?? 0, 0, 0);
    createClass.mutate(
      {
        name: name.trim(),
        classType,
        maxCapacity: Number.parseInt(capacity, 10) || 16,
        startTime: start.toISOString(),
        durationMin: 60,
      },
      {
        onSuccess: () => {
          setName("");
          setShowForm(false);
        },
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-classes-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />
          }
        >
          <AppHeader title="Classes" subtitle="Schedule group sessions members can book." showProfileShortcut={false} showBack />

          <SectionHeader
            title="Schedule"
            action={
              <ZookButton size="sm" variant={showForm ? "secondary" : "primary"} icon={showForm ? "close" : "add"} onPress={() => setShowForm((current) => !current)}>
                {showForm ? "Cancel" : "New class"}
              </ZookButton>
            }
          />

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <FormField label="Class name" value={name} onChangeText={setName} placeholder="Sunset Yoga Flow" />
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>Type</Text>
              <View style={styles.chipWrap}>
                {CLASS_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: classType === type }}
                    onPress={() => setClassType(type)}
                    style={[styles.chip, { borderColor: classType === type ? palette.accent.base : palette.border.default, backgroundColor: classType === type ? palette.surface.accentSoft : palette.surface.default }]}
                  >
                    <Text style={[styles.chipText, { color: classType === type ? palette.accent.base : palette.text.secondary }]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <DatePickerField label="Date" accessibilityLabel="Class date" value={date} onChange={setDate} minimumDate={new Date()} />
                </View>
                <FormField label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="16" style={styles.formField} />
              </View>
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>Time</Text>
              <View style={styles.chipWrap}>
                {TIME_SLOTS.map((time) => (
                  <Pressable
                    key={time.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: slot.label === time.label }}
                    onPress={() => setSlot(time)}
                    style={[styles.chip, { borderColor: slot.label === time.label ? palette.accent.base : palette.border.default, backgroundColor: slot.label === time.label ? palette.surface.accentSoft : palette.surface.default }]}
                  >
                    <Text style={[styles.chipText, { color: slot.label === time.label ? palette.accent.base : palette.text.secondary }]}>{time.label}</Text>
                  </Pressable>
                ))}
              </View>
              <ZookButton onPress={submit} disabled={!canSubmit} busy={createClass.isPending} busyLabel="Scheduling..." icon="calendar-outline">
                Schedule class
              </ZookButton>
            </Card>
          ) : null}

          <SectionHeader title="Upcoming classes" />
          {!classesQuery.isLoading && classes.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="calendar-outline" title="No classes scheduled" body="Schedule a class and members can book it." />
            </Card>
          ) : null}
          <View style={styles.stack}>
            {classes.map((entry) => {
              const visual = classTypeVisual(entry.classType);
              return (
                <Card key={entry.id} variant="compact" contentStyle={styles.classCard}>
                  <IconBubble icon={visual.icon} tone={visual.tone} size={42} />
                  <View style={styles.classCopy}>
                    <Text style={[styles.className, { color: palette.text.primary }]} numberOfLines={1}>{entry.name}</Text>
                    <Text style={[styles.classMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                      {classDayHeading(entry.startTime)} · {formatTime(entry.startTime)} · {entry.classType}
                    </Text>
                  </View>
                  <Pill tone={entry.remainingCapacity <= 0 ? "red" : "neutral"}>
                    {entry.enrollmentCount}/{entry.maxCapacity}
                  </Pill>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  formCard: { gap: spacing.md },
  formLabel: { ...typography.caption },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1, gap: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...typography.caption },
  stack: { gap: spacing.sm },
  classCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  classCopy: { flex: 1, gap: 2, minWidth: 0 },
  className: { ...typography.cardTitle },
  classMeta: { ...typography.small },
});
