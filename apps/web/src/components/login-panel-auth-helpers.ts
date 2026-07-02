import { ApiError } from "@zook/core";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export const OTP_RESEND_COOLDOWN_SECONDS = 30;

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function isValidPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return false;
  }
  if (trimmed.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(`+${digits}`);
  }
  return digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
}

export function rateLimitMessage(response: Response, locale: PublicLocale) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
  return { seconds, message: publicT(locale, "tooManyAttempts", { seconds }) };
}

function isInternalAuthError(error: unknown) {
  if (error instanceof ApiError && error.status >= 500) {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return /prisma|database server|localhost:5432|invocation|stack|sql|connection/i.test(message);
}

export function loginErrorMessage(error: unknown, fallback: string) {
  if (isInternalAuthError(error)) {
    return fallback;
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
