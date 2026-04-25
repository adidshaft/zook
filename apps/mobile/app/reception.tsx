import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  Dock,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryButton,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { formatLongDate, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import type { ReceptionQueueRecord } from "@/lib/query-hooks";
import { useReceptionQueue } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";



export default function Reception() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const queueQuery = useReceptionQueue();
  const records = queueQuery.data?.records ?? [];
  const pendingCount = records.filter((record) => record.status === "PENDING_APPROVAL").length;
  const flaggedCount = records.filter((record) => record.status === "FLAGGED").length;
  const expiringSoonCount = records.filter((record) => {
    if (!record.subscription?.endsAt) {
      return false;
    }
    const daysAway = Math.ceil(
      (new Date(record.subscription.endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    return daysAway >= 0 && daysAway <= 7;
  }).length;

  async function updateRecord(recordId: string, action: "approve" | "reject") {
    if (!token || !activeOrgId) {
      return;
    }
    try {
      await mobileApiFetch(`/orgs/${activeOrgId}/attendance/${recordId}/${action}`, {
        method: "POST",
        token,
        orgId: activeOrgId,
        ...(action === "reject"
          ? { body: { reason: "Reception review rejected this check-in." } }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "attendance", "live"] });
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "attendance", "live"] });
      throw error;
    }
  }

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "attendance", "live"] });
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        <ScreenHeader
          eyebrow="Reception desk"
          title="Live front-desk control"
          subtitle="Approve check-ins and manage the queue."
          trailing={<Pill tone="lime">{records.length} waiting</Pill>}
        />

        <View style={styles.metricGrid}>
          <MetricTile
            label="Pending approvals"
            value={String(pendingCount)}
            detail="Fresh scans waiting for staff confirmation."
            tone={pendingCount ? "amber" : "lime"}
          />
          <MetricTile
            label="Flagged scans"
            value={String(flaggedCount)}
            detail="Suspicious check-ins that need a fast decision."
            tone={flaggedCount ? "red" : "neutral"}
          />
          <MetricTile
            label="Expiring soon"
            value={String(expiringSoonCount)}
            detail="Queued members with a membership ending in the next week."
            tone={expiringSoonCount ? "violet" : "blue"}
          />
          <MetricTile
            label="Live feed"
            value={queueQuery.isLoading ? "Syncing" : "Active"}
            detail="The reception queue refreshes automatically."
            tone="blue"
          />
        </View>

        <SectionHeader
          eyebrow="Queue"
          title="Approval queue"
          subtitle="Pending and flagged scans."
        />

        {queueQuery.isLoading ? (
          <LoadingState
            title="Loading live queue"
            body="Pulling the latest pending and flagged attendance records."
          />
        ) : null}

        {!queueQuery.isLoading && !records.length ? (
          <EmptyState
            title="No live queue right now"
            body="Pending and flagged attendance records will appear here as soon as someone needs a manual review."
          />
        ) : null}

        <View style={styles.recordList}>
          {records.map((record) => (
            <ReceptionRecordCard key={record.id} record={record} onUpdate={updateRecord} />
          ))}
        </View>


      </ScrollView>
      <Dock />
    </Screen>
  );
}

function ReceptionRecordCard({
  record,
  onUpdate,
}: {
  record: ReceptionQueueRecord;
  onUpdate: (recordId: string, action: "approve" | "reject") => Promise<void>;
}) {
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpdate(action: "approve" | "reject") {
    try {
      setBusyAction(action);
      setErrorMessage(null);
      await onUpdate(record.id, action);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Card style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordCopy}>
          <Text style={styles.recordTitle}>
            {record.user?.name ?? record.user?.email ?? "Member"}
          </Text>
          <Text style={styles.recordBody}>
            {record.plan?.name ?? "Membership"} · checked in{" "}
            {formatRelativeDate(record.checkedInAt)}
          </Text>
        </View>
        <Pill tone={record.status === "FLAGGED" ? "red" : "amber"}>
          {titleCaseFromCode(record.status)}
        </Pill>
      </View>

      <View style={styles.metaWrap}>
        <Pill tone="blue">{formatLongDate(record.checkedInAt)}</Pill>
        {record.subscription?.endsAt ? (
          <Pill tone="violet">Expiry {formatLongDate(record.subscription.endsAt)}</Pill>
        ) : null}
        {record.subscription?.remainingVisits !== undefined &&
        record.subscription?.remainingVisits !== null ? (
          <Pill tone={record.subscription.remainingVisits <= 2 ? "amber" : "lime"}>
            {record.subscription.remainingVisits} visits left
          </Pill>
        ) : null}
      </View>

      {(record.suspiciousFlags ?? []).length ? (
        <View style={styles.metaWrap}>
          {(record.suspiciousFlags ?? []).map((flag) => (
            <Pill key={`${record.id}-${flag}`} tone="red">
              {flag}
            </Pill>
          ))}
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton onPress={() => void handleUpdate("approve")} style={styles.actionButton}>
          {busyAction === "approve" ? "Approving..." : "Approve"}
        </PrimaryButton>
        <SecondaryButton onPress={() => void handleUpdate("reject")} style={styles.actionButton}>
          {busyAction === "reject" ? "Rejecting..." : "Reject"}
        </SecondaryButton>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  recordList: {
    gap: 12,
  },
  recordCard: {
    gap: 14,
  },
  recordHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  recordCopy: {
    flex: 1,
    gap: 6,
  },
  recordTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },
  recordBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  errorText: {
    color: colors.red,
    lineHeight: 20,
  },
});
