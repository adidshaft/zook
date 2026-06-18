const queuedJobsSql = String.raw`
SELECT "id", "status", "queue", "kind", "dedupeKey", "attempts", "result", "lastError"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'platform_broadcast_fanout'
ORDER BY "createdAt" DESC
LIMIT 20;
`.trim();

const chunkNotificationsSql = String.raw`
SELECT
  "orgId",
  COUNT(*) AS notification_count,
  SUM(jsonb_array_length(COALESCE("metadata"->'selectedUserIds', '[]'::jsonb))) AS selected_users
FROM "Notification"
WHERE "metadata"->>'platformBroadcastId' = $1
GROUP BY "orgId"
ORDER BY "orgId";
`.trim();

const duplicateChunkAuditSql = String.raw`
SELECT
  "metadata"->>'platformBroadcastChunkKey' AS chunk_key,
  COUNT(*) AS duplicate_count
FROM "Notification"
WHERE "metadata"->>'platformBroadcastId' = $1
GROUP BY chunk_key
HAVING COUNT(*) > 1;
`.trim();

const fanoutProgressSql = String.raw`
SELECT
  "dedupeKey",
  "status",
  "attempts",
  "result"->>'broadcastId' AS broadcast_id,
  ("result"->>'recipients')::integer AS recipients,
  ("result"->>'chunks')::integer AS chunks,
  ("result"->>'completedChunks')::integer AS completed_chunks,
  "lastError",
  "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'platform_broadcast_fanout'
  AND "dedupeKey" = 'platform_broadcast:' || $1
ORDER BY "updatedAt" DESC
LIMIT 1;
`.trim();

const unfinishedJobsSql = String.raw`
SELECT "id", "status", "dedupeKey", "attempts", "lastError", "createdAt", "updatedAt"
FROM "BackgroundJob"
WHERE "queue" = 'notifications'
  AND "kind" = 'platform_broadcast_fanout'
  AND "status" IN ('QUEUED', 'RUNNING', 'FAILED', 'DEAD')
ORDER BY "createdAt" ASC;
`.trim();

const notificationMetadataSampleSql = String.raw`
SELECT "id", "orgId", "audience", "metadata", "createdAt"
FROM "Notification"
WHERE "metadata"->>'platformBroadcastId' = $1
ORDER BY "createdAt" ASC
LIMIT 20;
`.trim();

const sections = [
  ["queued-jobs", queuedJobsSql],
  ["fanout-progress", fanoutProgressSql],
  ["chunk-notifications", chunkNotificationsSql],
  ["duplicate-chunk-audit", duplicateChunkAuditSql],
  ["unfinished-jobs-before-rollback", unfinishedJobsSql],
  ["notification-metadata-sample", notificationMetadataSampleSql],
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

console.log("-- A3.2 Broadcast fan-out queue validation SQL");
console.log("-- Run only after A3.1 BackgroundJob exists on a staging clone.");
console.log("-- Use broadcast id as $1 for broadcast-specific queries.");
console.log("-- Do not delete queued jobs until operators confirm whether partial fan-out happened.\n");

for (const [name, sql] of selectedSections) {
  console.log(`-- ${name}`);
  console.log(`${sql}\n`);
}
