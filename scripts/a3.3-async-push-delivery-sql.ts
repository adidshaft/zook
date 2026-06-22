const queuedPushJobsSql = String.raw`
SELECT "id", "status", "queue", "kind", "dedupeKey", "attempts", "lastError", "createdAt"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'push_delivery'
ORDER BY "createdAt" DESC
LIMIT 50;
`.trim();

const pushJobProgressSql = String.raw`
SELECT
  "dedupeKey",
  "status",
  "attempts",
  "result"->>'notificationId' AS notification_id,
  ("result"->>'eligibleUsers')::integer AS eligible_users,
  ("result"->>'devices')::integer AS devices,
  ("result"->>'sent')::integer AS sent,
  ("result"->>'failed')::integer AS failed,
  ("result"->>'invalidatedDevices')::integer AS invalidated_devices,
  "result"->>'provider' AS provider,
  "lastError",
  "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'push_delivery'
  AND "dedupeKey" = 'push_delivery:' || $1
ORDER BY "updatedAt" DESC
LIMIT 1;
`.trim();

const deliveryOutcomesSql = String.raw`
SELECT "status", COUNT(*) AS count
FROM "PushDelivery"
WHERE "notificationId" = $1
GROUP BY "status"
ORDER BY "status";
`.trim();

const duplicateSuccessfulSendsSql = String.raw`
SELECT "notificationId", "deviceId", COUNT(*) AS sent_count
FROM "PushDelivery"
WHERE "status" = 'SENT'
GROUP BY "notificationId", "deviceId"
HAVING COUNT(*) > 1
ORDER BY sent_count DESC
LIMIT 50;
`.trim();

const notificationDuplicateSuccessfulSendsSql = String.raw`
SELECT "notificationId", "deviceId", COUNT(*) AS sent_count
FROM "PushDelivery"
WHERE "notificationId" = $1
  AND "status" = 'SENT'
GROUP BY "notificationId", "deviceId"
HAVING COUNT(*) > 1
ORDER BY sent_count DESC;
`.trim();

const invalidatedDeviceAuditSql = String.raw`
SELECT "status", COUNT(*) AS count
FROM "PushDevice"
GROUP BY "status"
ORDER BY "status";
`.trim();

const providerFailureSampleSql = String.raw`
SELECT
  "id",
  "notificationId",
  "deviceId",
  "provider",
  "status",
  "failureCode",
  "failureReason",
  "createdAt",
  "updatedAt"
FROM "PushDelivery"
WHERE "notificationId" = $1
  AND "status" = 'FAILED'
ORDER BY "updatedAt" DESC
LIMIT 50;
`.trim();

const unfinishedPushJobsSql = String.raw`
SELECT "id", "status", "dedupeKey", "attempts", "lastError", "createdAt", "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'push_delivery'
  AND "status" IN ('QUEUED', 'RUNNING', 'FAILED', 'DEAD')
ORDER BY "createdAt" ASC;
`.trim();

const sections = [
  ["queued-push-jobs", queuedPushJobsSql],
  ["push-job-progress", pushJobProgressSql],
  ["delivery-outcomes", deliveryOutcomesSql],
  ["duplicate-successful-sends", duplicateSuccessfulSendsSql],
  ["notification-duplicate-successful-sends", notificationDuplicateSuccessfulSendsSql],
  ["invalidated-device-audit", invalidatedDeviceAuditSql],
  ["provider-failure-sample", providerFailureSampleSql],
  ["unfinished-push-jobs-before-rollback", unfinishedPushJobsSql],
] as const;

const requestedSection = process.argv[2];
const selectedSections = requestedSection
  ? sections.filter(([name]) => name === requestedSection)
  : sections;

if (requestedSection && selectedSections.length === 0) {
  console.error(
    `Unknown section "${requestedSection}". Expected one of: ${sections.map(([name]) => name).join(", ")}`,
  );
  process.exit(1);
}

console.log("-- A3.3 Async push delivery queue validation SQL");
console.log("-- Run only after A3.1 BackgroundJob exists on a staging clone.");
console.log("-- Use notification id as $1 for notification-specific queries.");
console.log("-- Real-device push delivery remains a human/device QA gate.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
