import * as StoreReview from "expo-store-review";

import { getStoredValue, setStoredValue } from "./storage";

export type ReviewPromptTrigger = "checkin" | "workout" | "membership";

const firstLaunchStorageKey = "zook_review_first_launch_at";
const checkInCountStorageKey = "zook_review_successful_checkins";
const lastShownStorageKey = "zook_review_last_shown_at";
const minimumCheckIns = 3;
const minimumInstallAgeMs = 7 * 24 * 60 * 60 * 1000;
const repeatWindowMs = 120 * 24 * 60 * 60 * 1000;

function parseStoredNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getFirstLaunchAt(now: number) {
  const stored = parseStoredNumber(await getStoredValue(firstLaunchStorageKey));
  if (stored) {
    return stored;
  }
  await setStoredValue(firstLaunchStorageKey, `${now}`);
  return now;
}

async function getCheckInCount(trigger: ReviewPromptTrigger) {
  const current = parseStoredNumber(await getStoredValue(checkInCountStorageKey)) ?? 0;
  if (trigger !== "checkin") {
    return current;
  }
  const next = current + 1;
  await setStoredValue(checkInCountStorageKey, `${next}`);
  return next;
}

export async function maybeRequestReview(trigger: ReviewPromptTrigger) {
  try {
    const now = Date.now();
    const [firstLaunchAt, checkInCount, lastShownAt] = await Promise.all([
      getFirstLaunchAt(now),
      getCheckInCount(trigger),
      getStoredValue(lastShownStorageKey).then(parseStoredNumber),
    ]);

    if (checkInCount < minimumCheckIns) {
      return false;
    }
    if (now - firstLaunchAt < minimumInstallAgeMs) {
      return false;
    }
    if (lastShownAt && now - lastShownAt < repeatWindowMs) {
      return false;
    }
    if (!(await StoreReview.hasAction())) {
      return false;
    }

    await StoreReview.requestReview();
    await setStoredValue(lastShownStorageKey, `${now}`);
    return true;
  } catch {
    return false;
  }
}
