const queuedReminderJobsSql = String.raw`
SELECT "id", "status", "queue", "kind", "dedupeKey", "attempts", "result", "lastError", "createdAt"
FROM "BackgroundJob"
WHERE "queue" = 'reminders'
  AND "kind" = 'renewal_reminder_batch'
ORDER BY "createdAt" DESC
LIMIT 20;
`.trim();

const reminderJobProgressSql = String.raw`
SELECT
  "dedupeKey",
  "status",
  "attempts",
  "result"->>'dateKey' AS date_key,
  ("result"->>'remindersCreated')::integer AS reminders_created,
  ("result"->>'remindersSkipped')::integer AS reminders_skipped,
  ("result"->>'notificationsSent')::integer AS notifications_sent,
  ("result"->>'notificationFailures')::integer AS notification_failures,
  "lastError",
  "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'reminders'
  AND "kind" = 'renewal_reminder_batch'
  AND "dedupeKey" = 'renewal_reminder_batch:' || $1
ORDER BY "updatedAt" DESC
LIMIT 1;
`.trim();

const duplicateMemberRemindersSql = String.raw`
SELECT "subscriptionId", "kind", date_trunc('day', "dueAt") AS due_day, COUNT(*) AS reminder_count
FROM "SubscriptionReminder"
WHERE "subscriptionId" IS NOT NULL
  AND "kind" = 'SUBSCRIPTION_EXPIRING'
  AND "status" IN ('PENDING', 'SENT')
GROUP BY "subscriptionId", "kind", due_day
HAVING COUNT(*) > 1
ORDER BY reminder_count DESC;
`.trim();

const duplicateSaasTrialRemindersSql = String.raw`
SELECT
  "orgId",
  "kind",
  "metadata"->>'daysRemaining' AS days_remaining,
  COUNT(*) AS reminder_count
FROM "SubscriptionReminder"
WHERE "kind" = 'SAAS_TRIAL_END'
  AND "status" IN ('PENDING', 'SENT')
GROUP BY "orgId", "kind", days_remaining
HAVING COUNT(*) > 1
ORDER BY reminder_count DESC;
`.trim();

const reminderCountsByKindSql = String.raw`
SELECT
  "kind",
  "status",
  COUNT(*) AS reminder_count,
  MIN("dueAt") AS oldest_due_at,
  MAX("dueAt") AS newest_due_at
FROM "SubscriptionReminder"
GROUP BY "kind", "status"
ORDER BY "kind", "status";
`.trim();

const reminderNotificationSampleSql = String.raw`
SELECT
  sr."id" AS reminder_id,
  sr."orgId",
  sr."userId",
  sr."subscriptionId",
  sr."kind",
  sr."status",
  sr."dueAt",
  n."id" AS notification_id,
  n."type" AS notification_type,
  n."metadata" AS notification_metadata
FROM "SubscriptionReminder" sr
LEFT JOIN "Notification" n
  ON n."metadata"->>'reminderId' = sr."id"
WHERE sr."kind" IN ('SUBSCRIPTION_EXPIRING', 'SAAS_TRIAL_END')
ORDER BY sr."createdAt" DESC
LIMIT 50;
`.trim();

const unfinishedReminderJobsSql = String.raw`
SELECT "id", "status", "dedupeKey", "attempts", "lastError", "createdAt", "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'reminders'
  AND "kind" = 'renewal_reminder_batch'
  AND "status" IN ('QUEUED', 'RUNNING', 'FAILED', 'DEAD')
ORDER BY "createdAt" ASC;
`.trim();

const sections = [
  ["queued-reminder-jobs", queuedReminderJobsSql],
  ["reminder-job-progress", reminderJobProgressSql],
  ["duplicate-member-reminders", duplicateMemberRemindersSql],
  ["duplicate-saas-trial-reminders", duplicateSaasTrialRemindersSql],
  ["reminder-counts-by-kind", reminderCountsByKindSql],
  ["reminder-notification-sample", reminderNotificationSampleSql],
  ["unfinished-reminder-jobs-before-rollback", unfinishedReminderJobsSql],
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

console.log("-- A3.4 Renewal reminder queue validation SQL");
console.log("-- Run only after A3.1 BackgroundJob exists on a staging clone.");
console.log("-- Use reminder dateKey as $1 for reminder-job-progress.");
console.log("-- Do not add reminder uniqueness constraints before duplicate audits are reviewed.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
