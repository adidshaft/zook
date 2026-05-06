const sensitiveKeyPattern = /(password|token|secret|signature|otp|code|email|phone)/i;

export function redactPII<T>(value: T): T {
  return redactValue(value, new WeakSet()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactValue(item, seen),
    ]),
  );
}
