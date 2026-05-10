export function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") return "lime" as const;
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PAST_DUE") {
    return "amber" as const;
  }
  if (status === "EXPIRED" || status === "CANCELLED") return "red" as const;
  return "blue" as const;
}

export function isAutopayLive(autopay?: { status?: string | null } | null) {
  return Boolean(
    autopay &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        autopay.status ?? "",
      ),
  );
}
