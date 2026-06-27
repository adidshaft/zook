import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  DatePickerField,
  EmptyState,
  FormField,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import { useMyClasses } from "@/lib/domains";
import { useCancelClass, useCreateClass, useUpdateClass } from "@/lib/domains/trainer/queries";
import type { MemberClassRecord } from "@/lib/domains/shared/types";
import { classDayHeading, classTypeVisual } from "@/features/member/classes/class-display";
import { formatInr, formatTime } from "@/lib/formatting";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { radii, spacing, typography, layout, useTheme } from "@/lib/theme";

const CLASS_TYPES = ["HIIT", "Strength", "Yoga", "Cycling", "Dance", "Boxing", "Mobility"];
const CLASS_TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  HIIT: "trainer.classes.typeHiit",
  Strength: "trainer.classes.typeStrength",
  Yoga: "trainer.classes.typeYoga",
  Cycling: "trainer.classes.typeCycling",
  Dance: "trainer.classes.typeDance",
  Boxing: "trainer.classes.typeBoxing",
  Mobility: "trainer.classes.typeMobility",
};
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

function closestSlot(date: Date) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  return (
    TIME_SLOTS.find((slot) => slot.hour === hour && (slot.minute ?? 0) === minute) ?? TIME_SLOTS[3]
  );
}

type FormState = {
  name: string;
  classType: string;
  capacity: string;
  priceRupees: string;
  date: Date;
  slot: (typeof TIME_SLOTS)[number];
};

function defaultFormState(): FormState {
  return {
    name: "",
    classType: "Strength",
    capacity: "16",
    priceRupees: "0",
    date: tomorrow(),
    slot: TIME_SLOTS[3],
  };
}

function formStateFromClass(entry: MemberClassRecord): FormState {
  const start = new Date(entry.startTime);
  const dateOnly = new Date(start);
  dateOnly.setHours(0, 0, 0, 0);
  return {
    name: entry.name,
    classType: entry.classType,
    capacity: String(entry.maxCapacity),
    priceRupees: entry.pricePaise ? String(entry.pricePaise / 100) : "0",
    date: dateOnly,
    slot: closestSlot(start),
  };
}

function classTypeLabel(value: string, t: (key: TranslationKey) => string) {
  const key = CLASS_TYPE_LABEL_KEYS[value];
  return key ? t(key) : value;
}

export default function TrainerClasses() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const classesQuery = useMyClasses();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const cancelClass = useCancelClass();
  const cancelConfirm = useConfirmSheet();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState());

  const allClasses = classesQuery.data?.classes ?? [];
  const classes = allClasses.filter((entry) => entry.status !== "CANCELLED");
  const cancelledClasses = allClasses.filter((entry) => entry.status === "CANCELLED");
  const isEditing = Boolean(editingId);
  const saving = isEditing ? updateClass.isPending : createClass.isPending;
  const canSubmit =
    form.name.trim().length >= 2 && (Number.parseInt(form.capacity, 10) || 0) > 0 && !saving;

  async function refresh() {
    setRefreshing(true);
    await classesQuery.refetch();
    setRefreshing(false);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(defaultFormState());
    setShowForm(true);
  }

  function openEditForm(entry: MemberClassRecord) {
    setEditingId(entry.id);
    setForm(formStateFromClass(entry));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function submit() {
    if (!canSubmit) return;
    const start = new Date(form.date);
    start.setHours(form.slot.hour, form.slot.minute ?? 0, 0, 0);
    const payload = {
      name: form.name.trim(),
      classType: form.classType,
      maxCapacity: Number.parseInt(form.capacity, 10) || 16,
      pricePaise: Math.max(0, Math.round((Number.parseFloat(form.priceRupees) || 0) * 100)),
      startTime: start.toISOString(),
      durationMin: 60,
    };
    if (editingId) {
      updateClass.mutate(
        { classId: editingId, ...payload },
        { onSuccess: closeForm },
      );
      return;
    }
    createClass.mutate(payload, { onSuccess: closeForm });
  }

  function confirmCancel(entry: MemberClassRecord) {
    cancelConfirm.confirm({
      title: t("trainer.classes.cancelTitle", { name: entry.name }),
      body: t("trainer.classes.cancelBody"),
      destructiveLabel: t("trainer.classes.cancelClass"),
      cancelLabel: t("trainer.classes.keepClass"),
      onConfirm: () => {
        cancelClass.mutate(entry.id, {
          onSuccess: () => {
            if (editingId === entry.id) closeForm();
          },
        });
      },
    });
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
          <AppHeader title={t("trainer.classes.title")} subtitle={t("trainer.classes.subtitle")} showBack />

          <SectionHeader
            title={isEditing ? t("trainer.classes.editClass") : t("trainer.classes.schedule")}
            action={
              <ZookButton
                size="sm"
                variant={showForm ? "secondary" : "primary"}
                icon={showForm ? "close" : "add"}
                onPress={() => (showForm ? closeForm() : openCreateForm())}
              >
                {showForm ? t("common.cancel") : t("trainer.classes.newClass")}
              </ZookButton>
            }
          />

          {classesQuery.isError ? (
            <QueryErrorState error={classesQuery.error} onRetry={() => void classesQuery.refetch()} />
          ) : null}

          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <FormField label={t("trainer.classes.className")} value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder={t("trainer.classes.classNamePlaceholder")} />
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>{t("trainer.classes.type")}</Text>
              <View style={styles.chipWrap}>
                {CLASS_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.classType === type }}
                    onPress={() => setForm((current) => ({ ...current, classType: type }))}
                    style={[styles.chip, { borderColor: form.classType === type ? palette.accent.base : palette.border.default, backgroundColor: form.classType === type ? palette.surface.accentSoft : palette.surface.default }]}
                  >
                    <Text style={[styles.chipText, { color: form.classType === type ? palette.accent.base : palette.text.secondary }]}>{classTypeLabel(type, t)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <DatePickerField
                    label={t("trainer.classes.date")}
                    accessibilityLabel={t("trainer.classes.classDateAccessibility")}
                    value={form.date}
                    onChange={(date) => setForm((current) => ({ ...current, date }))}
                    minimumDate={new Date()}
                  />
                </View>
                <FormField
                  label={t("trainer.classes.capacity")}
                  value={form.capacity}
                  onChangeText={(capacity) => setForm((current) => ({ ...current, capacity }))}
                  keyboardType="number-pad"
                  placeholder="16"
                  style={styles.formField}
                />
              </View>
              <FormField
                label={t("trainer.classes.priceInr")}
                value={form.priceRupees}
                onChangeText={(priceRupees) => setForm((current) => ({ ...current, priceRupees }))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <Text style={[styles.formLabel, { color: palette.text.secondary }]}>{t("trainer.classes.time")}</Text>
              <View style={styles.chipWrap}>
                {TIME_SLOTS.map((time) => (
                  <Pressable
                    key={time.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.slot.label === time.label }}
                    onPress={() => setForm((current) => ({ ...current, slot: time }))}
                    style={[styles.chip, { borderColor: form.slot.label === time.label ? palette.accent.base : palette.border.default, backgroundColor: form.slot.label === time.label ? palette.surface.accentSoft : palette.surface.default }]}
                  >
                    <Text style={[styles.chipText, { color: form.slot.label === time.label ? palette.accent.base : palette.text.secondary }]}>{time.label}</Text>
                  </Pressable>
                ))}
              </View>
              <ZookButton
                onPress={submit}
                disabled={!canSubmit}
                busy={saving}
                busyLabel={isEditing ? t("common.saving") : t("trainer.classes.scheduling")}
                icon={isEditing ? "checkmark-outline" : "calendar-outline"}
              >
                {isEditing ? t("trainer.classes.saveChanges") : t("trainer.classes.scheduleClass")}
              </ZookButton>
              {isEditing && editingId ? (
                <ZookButton
                  variant="destructive"
                  icon="close-circle-outline"
                  busy={cancelClass.isPending}
                  busyLabel={t("member.classes.cancelling")}
                  onPress={() => {
                    const entry = classes.find((item) => item.id === editingId);
                    if (entry) confirmCancel(entry);
                  }}
                >
                  {t("trainer.classes.cancelClass")}
                </ZookButton>
              ) : null}
            </Card>
          ) : null}

          <SectionHeader title={t("trainer.classes.upcomingClasses")} />
          {classesQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stack}>
              {[0, 1, 2].map((item) => (
                <View key={item} style={styles.classCard}>
                  <Skeleton width={42} height={42} borderRadius={21} />
                  <View style={styles.classCopy}>
                    <Skeleton width="74%" height={16} borderRadius={8} />
                    <Skeleton width="88%" height={12} borderRadius={6} />
                  </View>
                  <Skeleton width={44} height={26} borderRadius={13} />
                </View>
              ))}
            </Card>
          ) : null}
          {!classesQuery.isLoading && classes.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="calendar-outline" title={t("member.classes.noClasses")} body={t("trainer.classes.noClassesBody")} />
            </Card>
          ) : null}
          <View style={styles.stack}>
            {classes.map((entry) => {
              const visual = classTypeVisual(entry.classType);
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={t("reception.desk.viewRosterFor", { name: entry.name })}
                  onPress={() =>
                    router.push(`/trainer/class-roster?classId=${entry.id}&name=${encodeURIComponent(entry.name)}` as never)
                  }
                  style={({ pressed }) => (pressed ? styles.cardPressed : null)}
                >
                  <Card variant="compact" contentStyle={styles.classCard}>
                    <IconBubble icon={visual.icon} tone={visual.tone} size={42} />
                    <View style={styles.classCopy}>
                      <Text style={[styles.className, { color: palette.text.primary }]} numberOfLines={1}>{entry.name}</Text>
                      <Text style={[styles.classMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                        {classDayHeading(entry.startTime)} · {formatTime(entry.startTime)} · {classTypeLabel(entry.classType, t)} · {entry.pricePaise && entry.pricePaise > 0 ? formatInr(entry.pricePaise) : t("member.classes.free")}
                      </Text>
                    </View>
                    <Pill tone={entry.remainingCapacity <= 0 ? "red" : "neutral"}>
                      {entry.enrollmentCount}/{entry.maxCapacity}
                    </Pill>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("trainer.classes.editAccessibility", { name: entry.name })}
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        openEditForm(entry);
                      }}
                      style={styles.editButton}
                    >
                      <Ionicons name="pencil-outline" size={18} color={palette.text.secondary} />
                    </Pressable>
                    <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
                  </Card>
                </Pressable>
              );
            })}
          </View>

          {cancelledClasses.length > 0 ? (
            <>
              <SectionHeader title={t("trainer.classes.cancelled")} />
              <View style={styles.stack}>
                {cancelledClasses.map((entry) => {
                  const visual = classTypeVisual(entry.classType);
                  return (
                    <Card key={entry.id} variant="compact" contentStyle={[styles.classCard, styles.cancelledCard]}>
                      <IconBubble icon={visual.icon} tone="neutral" size={42} />
                      <View style={styles.classCopy}>
                        <Text style={[styles.className, styles.cancelledText, { color: palette.text.secondary }]} numberOfLines={1}>
                          {entry.name}
                        </Text>
                        <Text style={[styles.classMeta, { color: palette.text.tertiary }]} numberOfLines={1}>
                          {classDayHeading(entry.startTime)} · {formatTime(entry.startTime)} · {classTypeLabel(entry.classType, t)}
                        </Text>
                      </View>
                      <Pill tone="neutral">{t("trainer.classes.cancelled")}</Pill>
                    </Card>
                  );
                })}
              </View>
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
      {cancelConfirm.sheet}
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
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  classCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  classCopy: { flex: 1, gap: 2, minWidth: 0 },
  className: { ...typography.cardTitle },
  classMeta: { ...typography.small },
  editButton: { padding: spacing.xs },
  cancelledCard: { opacity: 0.6 },
  cancelledText: { textDecorationLine: "line-through" },
});
