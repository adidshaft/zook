export function normalizeRupeeInput(value: string) {
  const compact = value.replace(/[₹,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = compact.split(".");
  const fraction = fractionParts.join("").slice(0, 2);

  if (!compact.includes(".")) {
    return whole;
  }

  return `${whole}.${fraction}`;
}

export function rupeesToPaise(input: string) {
  const normalized = normalizeRupeeInput(input);
  if (!normalized) {
    return null;
  }
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100);
}

export function getRupeeAmountError(value: string) {
  const normalized = normalizeRupeeInput(value);
  if (!normalized) {
    return "Enter the amount collected.";
  }
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return "Use numbers only, with up to 2 decimal places.";
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter an amount greater than ₹0.";
  }
  return null;
}
