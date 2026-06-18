export function sanitizeOtpValue(value: string, length = 6) {
  return value.normalize("NFKC").replace(/\D/g, "").slice(0, length);
}
