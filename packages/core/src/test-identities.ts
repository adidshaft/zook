import { normalizeLoginIdentifier, type LoginIdentifier } from "./validators";

export const QA_TEST_OTP = "000000";

export const QA_FRESH_ACCOUNT_EMAIL = "fresh@zook.local";
export const QA_FRESH_ACCOUNT_PHONE = "+919000011111";

export const QA_DEMO_ACCOUNT_EMAIL = "member@zook.local";
export const QA_DEMO_ACCOUNT_PHONE = "+919876543210";

export const SEEDED_DEMO_ACCOUNT_EMAILS = [
  "platform@zook.local",
  "owner@zook.local",
  "admin@zook.local",
  "reception@zook.local",
  "trainer@zook.local",
  "member@zook.local",
  "member2@zook.local",
  "desk-test-member@zook.local",
  "prospect@zook.local",
  "minor@zook.local",
] as const;

export const SEEDED_DEMO_ACCOUNT_PHONES = [
  "+919000000001",
  "+919988777665",
  "+919700000002",
  "+919765432109",
  "+919123456780",
  "+919876543210",
  "+919876543211",
  "+919444000222",
  "+919555000111",
  "+919000012345",
] as const;

const qaFreshEmail = QA_FRESH_ACCOUNT_EMAIL.toLowerCase();
const qaDemoEmail = QA_DEMO_ACCOUNT_EMAIL.toLowerCase();
const seededDemoEmails = new Set<string>(SEEDED_DEMO_ACCOUNT_EMAILS);
const seededDemoPhones = new Set<string>(SEEDED_DEMO_ACCOUNT_PHONES);

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

export function isSeededDemoIdentifier(identifier: LoginIdentifier | string) {
  const normalized =
    typeof identifier === "string" ? normalizeLoginIdentifier(identifier) : identifier;
  return normalized.kind === "email"
    ? seededDemoEmails.has(normalized.value.toLowerCase())
    : seededDemoPhones.has(normalized.value);
}
