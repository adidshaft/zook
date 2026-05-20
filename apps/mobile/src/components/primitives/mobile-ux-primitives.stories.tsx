import { useState } from "react";
import { View } from "react-native";
import { ApprovalQueue } from "@/components/domain/approval-queue";
import { AttentionCard } from "@/components/domain/attention";
import { MemberList } from "@/components/domain/member-list";
import { MetricGrid } from "@/components/domain/metric-grid";
import { ChipGroup, DatePickerField, NetworkBanner, OtpInput, QueryErrorState, ZookButton } from "@/components/primitives";
import { spacing } from "@/lib/theme";
import { ThemeProvider } from "@/lib/theme/index";

export function MobileUxPrimitivesStory() {
  const [chip, setChip] = useState<"scan" | "code">("scan");
  const [date, setDate] = useState(new Date());
  const [otp, setOtp] = useState("");

  return (
    <ThemeProvider>
      <View style={{ gap: spacing.lg, padding: spacing.lg }}>
        <NetworkBanner />
        <ChipGroup
          accessibilityLabel="Scan mode"
          value={chip}
          onChange={setChip}
          options={[
            { label: "Scan QR", value: "scan", icon: "qr-code-outline" },
            { label: "Enter code", value: "code", icon: "keypad-outline" },
          ]}
        />
        <ZookButton busy busyLabel="Saving">
          Save
        </ZookButton>
        <DatePickerField
          accessibilityLabel="Workout date"
          label="Workout date"
          value={date}
          onChange={setDate}
        />
        <OtpInput
          accessibilityLabel="One-time code"
          label="One-time code"
          value={otp}
          onChange={setOtp}
        />
        <QueryErrorState error={new Error("Network unavailable")} onRetry={() => undefined} />
        <MetricGrid
          items={[
            { label: "Members", value: 128, hint: "Populated", tone: "lime", icon: "people-outline" },
            { label: "Pending", value: 4, hint: "Amber tone", tone: "amber", icon: "time-outline" },
            { label: "Errors", value: 1, hint: "Danger tone", tone: "red", icon: "alert-circle-outline" },
          ]}
        />
        <MemberList
          testID="story-member-list"
          items={[
            {
              id: "member-1",
              name: "Asha Rao",
              email: "asha@example.com",
              phone: "+91 98765 43210",
              status: "active",
              meta: "Strength training",
              phoneRevealed: false,
            },
          ]}
          onPressMember={() => undefined}
          onRevealPhone={() => undefined}
          availableFilters={[{ kind: "all" }, { kind: "status", status: "active" }]}
          filter={{ kind: "all" }}
          onFilterChange={() => undefined}
          emptyState={{ title: "No members", subtitle: "Empty state" }}
        />
        <MemberList items={[]} isLoading onPressMember={() => undefined} />
        <MemberList items={[]} isError onRetry={() => undefined} onPressMember={() => undefined} />
        <ApprovalQueue
          items={[
            {
              id: "approval-1",
              primaryText: "Asha Rao",
              secondaryText: "Wants to check in at Main branch",
              reason: "Desk approval is required.",
            },
          ]}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
        <ApprovalQueue items={[]} isLoading onApprove={() => undefined} />
        <ApprovalQueue items={[]} isError onRetry={() => undefined} onApprove={() => undefined} />
        <AttentionCard
          items={[
            {
              id: "attention-1",
              icon: "card-outline",
              title: "Payment exception",
              subtitle: "One transaction needs review",
              tone: "amber",
              cta: { label: "Review", onPress: () => undefined },
            },
          ]}
        />
        <AttentionCard items={[]} emptyState={{ title: "All clear", subtitle: "Empty state" }} />
      </View>
    </ThemeProvider>
  );
}
