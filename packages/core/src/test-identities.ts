import { normalizeLoginIdentifier, type LoginIdentifier } from "./validators";

export const QA_TEST_OTP = "000000";

export const QA_FRESH_ACCOUNT_EMAIL = "fresh@zook.local";
export const QA_FRESH_ACCOUNT_PHONE = "+919000011111";

export const QA_DEMO_ACCOUNT_EMAIL = "member@zook.local";
export const QA_DEMO_ACCOUNT_PHONE = "+919876543210";

const qaFreshEmail = QA_FRESH_ACCOUNT_EMAIL.toLowerCase();
const qaDemoEmail = QA_DEMO_ACCOUNT_EMAIL.toLowerCase();

export function isQaFreshIdentifier(identifier: LoginIdentifier | string) {
  const normalized =
    typeof identifier === "string" ? normalizeLoginIdentifier(identifier) : identifier;
  return (
    (normalized.kind === "email" && normalized.value.toLowerCase() === qaFreshEmail) ||
    (normalized.kind === "phone" && normalized.value === QA_FRESH_ACCOUNT_PHONE)
  );
}

export function isQaDemoIdentifier(identifier: LoginIdentifier | string) {
  const normalized =
    typeof identifier === "string" ? normalizeLoginIdentifier(identifier) : identifier;
  return (
    (normalized.kind === "email" && normalized.value.toLowerCase() === qaDemoEmail) ||
    (normalized.kind === "phone" && normalized.value === QA_DEMO_ACCOUNT_PHONE)
  );
}
