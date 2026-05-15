import Constants from "expo-constants";
import type * as NotificationsModule from "expo-notifications";
import { Platform } from "react-native";
import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const REMINDER_STORAGE_KEY = "zook_smart_check_in_reminder_id";
const isExpoGoEnvironment = Constants.executionEnvironment === "storeClient";
const NativeNotifications = (() => {
  if (isExpoGoEnvironment) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go crashes if this native module is imported eagerly.
    return require("expo-notifications") as typeof NotificationsModule;
  } catch {
    return null;
  }
})();

export type ReminderAttendance = {
  checkedInAt?: string | null;
};

export function estimateNextReminderTime(attendance: ReminderAttendance[]) {
  const lastCheckIn = attendance
    .map((record) => (record.checkedInAt ? new Date(record.checkedInAt) : null))
    .find((date): date is Date => Boolean(date && Number.isFinite(date.getTime())));
  if (!lastCheckIn) {
    return null;
  }
  const next = new Date();
  next.setHours(lastCheckIn.getHours(), Math.max(0, lastCheckIn.getMinutes() - 30), 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function syncSmartCheckInReminder(input: {
  enabled: boolean;
  gymName?: string | null;
  recentAttendance: ReminderAttendance[];
}) {
  if (Platform.OS === "web" || isExpoGoEnvironment || !NativeNotifications) {
    return "unsupported" as const;
  }

  const existingId = await getStoredValue(REMINDER_STORAGE_KEY);
  if (existingId) {
    await NativeNotifications.cancelScheduledNotificationAsync(existingId).catch(() => undefined);
    await deleteStoredValue(REMINDER_STORAGE_KEY);
  }

  if (!input.enabled) {
    return "disabled" as const;
  }

  const permission = await NativeNotifications.getPermissionsAsync();
  if (!permission.granted) {
    return "permission-needed" as const;
  }

  const reminderAt = estimateNextReminderTime(input.recentAttendance);
  if (!reminderAt) {
    return "not-enough-history" as const;
  }

  const id = await NativeNotifications.scheduleNotificationAsync({
    content: {
      title: "Gym time soon",
      body: input.gymName
        ? `You usually check in around this time at ${input.gymName}.`
        : "You usually check in around this time.",
      data: { href: "/scan", type: "check_in_reminder" },
    },
    trigger: reminderAt as unknown as NotificationsModule.NotificationTriggerInput,
  });
  await setStoredValue(REMINDER_STORAGE_KEY, id);
  return "scheduled" as const;
}
