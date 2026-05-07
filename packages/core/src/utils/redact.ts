const sensitiveKeyPattern =
  /(password|passcode|token|secret|signature|otp|code|email|e[-_]?mail|phone|mobile|contact|identifier|authorization|cookie|session|aadhaar|pan|upi|address|date[-_]?of[-_]?birth|dob|guardian)/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export function redactPII<T>(value: T): T {
  return redactValue(value, new WeakSet()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return value.replace(emailPattern, "[REDACTED_EMAIL]").replace(phonePattern, "[REDACTED_PHONE]");
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactValue(item, seen),
    ]),
  );
}
