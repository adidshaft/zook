import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

type BlockedReason = "cancelled" | "pastDue" | "paymentPending" | "paused";

const copyByReason = {
  cancelled: {
    body: "member.membership.guidanceCancelledBody",
    cta: "member.membership.guidanceRenewOrChangePlan",
    icon: "close-circle-outline",
    testID: "home-state-membership-cancelled",
    title: "member.membership.guidanceCancelledTitle",
    tone: "red",
  },
  pastDue: {
    body: "member.membership.guidancePastDueBody",
    cta: "member.membership.guidanceRenewNow",
    icon: "alert-circle-outline",
    testID: "home-state-membership-past-due",
    title: "member.membership.guidancePastDueTitle",
    tone: "amber",
  },
  paymentPending: {
    body: "member.membership.guidancePaymentPendingBody",
    cta: "member.membership.guidanceCompletePayment",
    icon: "time-outline",
    testID: "home-state-membership-payment-pending",
    title: "member.membership.guidancePaymentPendingTitle",
    tone: "amber",
  },
  paused: {
    body: "member.membership.guidancePausedBody",
    cta: "member.home.openMembership",
    icon: "pause-circle-outline",
    testID: "home-state-membership-paused",
    title: "member.membership.guidancePausedTitle",
    tone: "blue",
  },
} as const;

export default function MembershipBlockedCard({ reason }: { reason: BlockedReason }) {
  const t = useT();
  const copy = copyByReason[reason];

  return (
    <HomeCardShell
      testID={copy.testID}
      icon={copy.icon}
      title={t(copy.title)}
      body={t(copy.body)}
      ctaHref="/membership"
      ctaLabel={t(copy.cta)}
      tone={copy.tone}
    />
  );
}
