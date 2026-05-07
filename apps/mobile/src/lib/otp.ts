export function sanitizeOtpValue(value: string, length = 6) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, length);
}
