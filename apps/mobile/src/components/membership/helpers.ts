export function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") return "lime" as const;
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PAST_DUE") {
    return "amber" as const;
  }
  if (
    status === "EXPIRED" ||
    status === "CANCELLED" ||
    status === "REJECTED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  ) {
    return "red" as const;
  }
  return "blue" as const;
}

export function membershipStatusGuidance(status?: string | null, daysLeft?: number | null) {
  if (status === "PENDING_PAYMENT" || status === "PENDING") {
    return {
      title: "Payment pending",
      body: "Complete payment or ask the desk to record an offline payment before using entry.",
      action: "Complete payment",
    };
  }
  if (status === "PAST_DUE") {
    return {
      title: "Renewal overdue",
      body: "Your membership needs payment confirmation before the gym can treat it as active.",
      action: "Pay now",
    };
  }
  if (status === "EXPIRED") {
    return {
      title: "Membership expired",
      body: "Renew this plan or choose a new plan to restore QR entry and member benefits.",
      action: "Renew now",
    };
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return {
      title: "Membership not active",
      body: "This membership cannot be used for entry. Contact the gym or choose another plan.",
      action: "Choose plan",
    };
  }
  if (status === "FAILED") {
    return {
      title: "Payment failed",
      body: "No money was confirmed for this membership. Try again or ask the desk for help.",
      action: "Try payment again",
    };
  }
  if (typeof daysLeft === "number" && daysLeft <= 7) {
    return {
      title: "Renewal window",
      body: daysLeft === 0 ? "Renew today to avoid an entry interruption." : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Renew early to keep entry uninterrupted.`,
      action: "Renew membership",
    };
  }
  return {
    title: "Membership ready",
    body: "Your QR entry and member benefits are active for this gym.",
    action: "Renew or change plan",
  };
}

export function isAutopayLive(autopay?: { status?: string | null } | null) {
  return Boolean(
    autopay &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        autopay.status ?? "",
      ),
  );
}
