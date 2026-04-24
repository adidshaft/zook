import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Card,
  EmptyState,
  LoadingState,
  Pill,
  PrimaryLink,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { formatDateTime, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import { useMyAttendance } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type AttendanceRecord = {
  id: string;
  checkedInAt: string;
  status?: string | null;
  source?: string | null;
  rejectionReason?: string | null;
  suspiciousFlags?: string[] | null;
};

function toneForStatus(status?: string | null) {
  if (status === "APPROVED") {
    return "lime" as const;
  }
  if (status === "PENDING") {
    return "amber" as const;
  }
  if (status === "REJECTED") {
    return "red" as const;
  }
  return "blue" as const;
}

export default function AttendanceResultScreen() {
  const routeParams = useLocalSearchParams<{
    attendanceRecordId?: string;
    focus?: string;
    notificationId?: string;
  }>();
  const attendanceQuery = useMyAttendance();
  const records = (attendanceQuery.data?.attendance ?? []) as AttendanceRecord[];
  const highlightedId = Array.isArray(routeParams.attendanceRecordId)
    ? routeParams.attendanceRecordId[0]
    : routeParams.attendanceRecordId;
  const sortedRecords = [...records].sort((left, right) => {
    if (left.id === highlightedId) {
      return -1;
    }
    if (right.id === highlightedId) {
      return 1;
    }
    return 0;
  });
  const highlightedRecord = sortedRecords[0];

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Attendance"
          title="Track the last scan, approval, and desk outcome."
          subtitle="Push attendance alerts land here so pilot testers can verify the mobile result against the backend record."
        />

        {routeParams.focus === "attendance" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Opened from push</Pill>
            <Text style={styles.calloutTitle} selectable>
              Attendance notification context is active.
            </Text>
            <Text style={styles.body} selectable>
              {highlightedId
                ? `Attendance record ${highlightedId} is highlighted below.`
                : "The app routed to the attendance screen without a specific record ID."}
            </Text>
          </Card>
        ) : null}

        {attendanceQuery.isLoading ? (
          <LoadingState
            title="Loading attendance history"
            body="Pulling the latest check-ins, approvals, and duplicate-scan outcomes."
          />
        ) : null}

        {!attendanceQuery.isLoading && !records.length ? (
          <EmptyState
            title="No attendance records yet"
            body="Scan a QR code or complete a manual token flow to create the first attendance event."
            action={<PrimaryLink href="/scan">Open scanner</PrimaryLink>}
          />
        ) : null}

        {highlightedRecord ? (
          <>
            <SectionHeader
              eyebrow="Latest focus"
              title="Highlighted attendance result"
              subtitle="This card is promoted when a push payload carries a specific attendance record."
            />
            <Card style={styles.featuredCard}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.title} selectable>
                    {formatRelativeDate(highlightedRecord.checkedInAt)}
                  </Text>
                  <Text style={styles.body} selectable>
                    {formatDateTime(highlightedRecord.checkedInAt)}
                  </Text>
                </View>
                <Pill tone={toneForStatus(highlightedRecord.status)}>
                  {titleCaseFromCode(highlightedRecord.status ?? "RECORDED")}
                </Pill>
              </View>
              <Text style={styles.body} selectable>
                Source: {titleCaseFromCode(highlightedRecord.source ?? "QR")}
              </Text>
              {highlightedRecord.rejectionReason ? (
                <Text style={styles.alertText} selectable>
                  Rejection reason: {highlightedRecord.rejectionReason}
                </Text>
              ) : null}
              {highlightedRecord.suspiciousFlags?.length ? (
                <Text style={styles.alertText} selectable>
                  Flags: {highlightedRecord.suspiciousFlags.join(", ")}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}

        {sortedRecords.length > 1 ? (
          <>
            <SectionHeader
              eyebrow="History"
              title="Recent check-ins"
              subtitle="Operators can compare the highlighted record with the rest of the recent attendance trail."
            />
            <View style={styles.stack}>
              {sortedRecords.slice(1, 6).map((record) => (
                <Card key={record.id}>
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <Text style={styles.listTitle} selectable>
                        {formatRelativeDate(record.checkedInAt)}
                      </Text>
                      <Text style={styles.body} selectable>
                        {formatDateTime(record.checkedInAt)}
                      </Text>
                    </View>
                    <Pill tone={toneForStatus(record.status)}>
                      {titleCaseFromCode(record.status ?? "RECORDED")}
                    </Pill>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  calloutCard: {
    gap: 10,
  },
  calloutTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  featuredCard: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    lineHeight: 21,
  },
  alertText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
});
