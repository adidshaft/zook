import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const QUEUE_STORAGE_KEY = "zook_attendance_scan_queue_v1";
const MAX_QUEUE_SIZE = 12;

export type QueuedAttendanceScan = {
  id: string;
  payload: string;
  kind: "qr" | "code";
  createdAt: string;
};

function parseQueue(value: string | null): QueuedAttendanceScan[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedAttendanceScan =>
        typeof item?.id === "string" &&
        typeof item.payload === "string" &&
        (item.kind === "qr" || item.kind === "code") &&
        typeof item.createdAt === "string",
    );
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAttendanceScan[]) {
  if (!queue.length) {
    await deleteStoredValue(QUEUE_STORAGE_KEY);
    return;
  }
  await setStoredValue(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
}

export async function getQueuedAttendanceScans() {
  return parseQueue(await getStoredValue(QUEUE_STORAGE_KEY));
}

export async function enqueueAttendanceScan(input: Pick<QueuedAttendanceScan, "payload" | "kind">) {
  const queue = await getQueuedAttendanceScans();
  const duplicate = queue.find(
    (item) => item.payload === input.payload && item.kind === input.kind,
  );
  if (duplicate) {
    return queue;
  }
  const next = [
    ...queue,
    {
      id: `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      payload: input.payload,
      kind: input.kind,
      createdAt: new Date().toISOString(),
    },
  ].slice(-MAX_QUEUE_SIZE);
  await writeQueue(next);
  return next;
}

export async function removeQueuedAttendanceScan(id: string) {
  const next = (await getQueuedAttendanceScans()).filter((item) => item.id !== id);
  await writeQueue(next);
  return next;
}

export function isRetriableAttendanceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /internet|network|offline|connect|timed out|failed to fetch/i.test(message);
}
