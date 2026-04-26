import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookMockServices } from "@zook/core";
import {
  ActiveGymPill,
  Card,
  ConfirmationRing,
  Dock,
  EntryCodeCard,
  ListRow,
  Pill,
  PrimaryButton,
  PrimaryLink,
  Screen,
  SecondaryButton,
  SegmentedControl,
} from "@/components/primitives";
import { colors } from "@/lib/theme";

type DemoOutcome = "approved" | "pending" | "flagged" | "rejected";
type Result = Awaited<ReturnType<typeof zookMockServices.attendanceService.scanQr>>;

const outcomeOptions: Array<{ label: string; value: DemoOutcome }> = [
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Flagged", value: "flagged" },
  { label: "Rejected", value: "rejected" },
];

export default function Scan() {
  const [outcome, setOutcome] = useState<DemoOutcome>("approved");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function simulateScan(nextOutcome = outcome) {
    setBusy(true);
    try {
      const nextResult = await zookMockServices.attendanceService.scanQr(`zook-demo-${nextOutcome}`);
      setResult(nextResult);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const approved = result.status === "APPROVED";
    const pending = result.status === "PENDING_APPROVAL";
    const flagged = result.status === "FLAGGED";
    return (
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.resultContent}>
          <View style={styles.resultHeader}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Pill tone={approved ? "lime" : pending ? "amber" : flagged ? "red" : "red"}>
              {approved ? "Approved" : pending ? "Pending approval" : flagged ? "Flagged" : "Rejected"}
            </Pill>
          </View>

          <ConfirmationRing
            tone={approved ? "lime" : pending ? "amber" : "red"}
            icon={approved ? "checkmark" : pending ? "time-outline" : "alert-outline"}
          />

          <View style={styles.resultCopy}>
            <Text style={styles.resultTitle}>
              {approved
                ? "Checked in"
                : pending
                  ? "Waiting for desk approval"
                  : flagged
                    ? "Desk review required"
                    : "Check-in rejected"}
            </Text>
            <Text style={styles.resultBody}>
              {approved
                ? "Entry approved for Iron Temple Gym."
                : pending
                  ? "Your check-in was received. Please show this code to Priya at reception."
                  : flagged
                    ? "This scan needs staff review before entry."
                    : "This scan could not be approved by the server gate."}
            </Text>
          </View>

          <EntryCodeCard
            code={result.entryCode}
            status={approved ? "Approved" : pending ? "Pending approval" : flagged ? "Flagged" : "Rejected"}
            detail="Show this to the front desk if asked."
          />

          <Card style={styles.detailCard}>
            <ListRow title="Time" subtitle="7:14 AM" trailing={<Pill tone="neutral">Today</Pill>} />
            <ListRow title="Branch" subtitle={result.branchName} trailing={<Pill tone="blue">Verified</Pill>} />
            <ListRow title="Plan" subtitle={result.planName} trailing={<Pill tone="lime">Active</Pill>} />
            <ListRow title="Server validation" subtitle={result.reason} trailing={<Ionicons name="lock-closed-outline" size={20} color={colors.lime} />} />
          </Card>

          {pending ? (
            <Card style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>Why review?</Text>
              <Text style={styles.reasonBody}>
                This scan needs staff confirmation because attendance approval mode is enabled.
              </Text>
            </Card>
          ) : null}

          {approved ? (
            <Card style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>Next up</Text>
              <Text style={styles.reasonBody}>Push Day workout assigned by Coach Rhea.</Text>
              <PrimaryLink href="/plans">Open Plan</PrimaryLink>
            </Card>
          ) : null}

          <View style={styles.actionRow}>
            <SecondaryButton onPress={() => setResult(null)} style={styles.actionHalf}>
              Scan again
            </SecondaryButton>
            <PrimaryButton onPress={() => setResult(null)} style={styles.actionHalf}>
              Back to Check-in
            </PrimaryButton>
          </View>
        </ScrollView>
        <Dock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ActiveGymPill label="Iron Temple Gym · Pune" />
          <Text style={styles.title}>Scan Gym QR</Text>
          <Text style={styles.subtitle}>Scan the rolling QR at the reception desk.</Text>
        </View>

        <Pressable
          onPress={() => void simulateScan()}
          accessibilityRole="button"
          accessibilityLabel="Simulate gym QR scan"
          style={styles.scannerFrame}
        >
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <Ionicons name="qr-code-outline" size={88} color={colors.lime} />
          <Text style={styles.scannerText}>{busy ? "Validating with server..." : "Tap to simulate scan"}</Text>
        </Pressable>

        <Card style={styles.checklistCard}>
          <Text style={styles.cardTitle}>Validation checklist</Text>
          <ListRow title="Membership active" subtitle="Hybrid Pro · 22 days left" trailing={<Pill tone="lime">Clear</Pill>} />
          <ListRow title="Branch verified" subtitle="Default Branch" trailing={<Pill tone="lime">Clear</Pill>} />
          <ListRow title="Server-authorized check-in" subtitle="Replay and minor gates checked" trailing={<Pill tone="lime">Required</Pill>} />
        </Card>

        <Card style={styles.helpCard}>
          <View style={styles.helpHeader}>
            <View>
              <Text style={styles.cardTitle}>Need help?</Text>
              <Text style={styles.cardBody}>Ask Priya at reception to verify your entry code.</Text>
            </View>
            <Pill tone="lime">Auto check-in enabled</Pill>
          </View>
        </Card>

        <Card style={styles.demoCard}>
          <Text style={styles.cardTitle}>Demo scan outcome</Text>
          <SegmentedControl options={outcomeOptions} value={outcome} onChange={setOutcome} />
          <PrimaryButton onPress={() => void simulateScan()} disabled={busy}>
            {busy ? "Validating..." : "Simulate server scan"}
          </PrimaryButton>
        </Card>
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 120,
  },
  header: {
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  scannerFrame: {
    height: 330,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.25)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 54,
    height: 54,
    borderColor: colors.lime,
  },
  cornerTopLeft: {
    top: 26,
    left: 26,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: 26,
    right: 26,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: 26,
    left: 26,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    bottom: 26,
    right: 26,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 18,
  },
  scannerText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  checklistCard: {
    gap: 12,
  },
  helpCard: {
    gap: 12,
  },
  helpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  demoCard: {
    gap: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 6,
  },
  resultContent: {
    padding: 20,
    gap: 18,
    paddingBottom: 120,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultCopy: {
    alignItems: "center",
    gap: 8,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  resultBody: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: "center",
  },
  detailCard: {
    gap: 10,
  },
  reasonCard: {
    gap: 12,
  },
  reasonTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  reasonBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});
