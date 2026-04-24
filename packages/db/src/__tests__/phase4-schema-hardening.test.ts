import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AccountDeletionJobStatus,
  AuditRiskLevel,
  DataExportFormat,
  DataExportJobStatus,
  GuardianConsentChallengeChannel,
  GuardianConsentChallengeStatus,
  IncidentSeverity,
  IncidentStatus,
  PaymentEventStatus,
  PaymentWebhookAttemptStatus,
  ProviderHealthCheckStatus,
  ProviderHealthDomain,
  PushDeliveryStatus,
  PushDeviceStatus,
  PushPlatform
} from "@prisma/client";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaSource = readFileSync(resolve(currentDir, "../../prisma/schema.prisma"), "utf8");
const seedSource = readFileSync(resolve(currentDir, "../../prisma/seed.ts"), "utf8");

describe("Phase 4 schema hardening", () => {
  it("exports the new Phase 4 enums from the generated Prisma client", () => {
    expect(AuditRiskLevel.HIGH).toBe("HIGH");
    expect(PaymentEventStatus.QUARANTINED).toBe("QUARANTINED");
    expect(PaymentWebhookAttemptStatus.SUCCEEDED).toBe("SUCCEEDED");
    expect(PushPlatform.IOS).toBe("IOS");
    expect(PushDeviceStatus.INVALIDATED).toBe("INVALIDATED");
    expect(PushDeliveryStatus.DELIVERED).toBe("DELIVERED");
    expect(GuardianConsentChallengeStatus.PENDING).toBe("PENDING");
    expect(GuardianConsentChallengeChannel.EMAIL_OTP).toBe("EMAIL_OTP");
    expect(DataExportFormat.JSON).toBe("JSON");
    expect(DataExportJobStatus.SUCCEEDED).toBe("SUCCEEDED");
    expect(AccountDeletionJobStatus.QUEUED).toBe("QUEUED");
    expect(IncidentSeverity.CRITICAL).toBe("CRITICAL");
    expect(IncidentStatus.MONITORING).toBe("MONITORING");
    expect(ProviderHealthDomain.PUSH).toBe("PUSH");
    expect(ProviderHealthCheckStatus.DEGRADED).toBe("DEGRADED");
  });

  it("defines the hardened models and additive fields in schema.prisma", () => {
    const requiredPatterns = [
      /model AuditLog\s*{[\s\S]*\bbefore\s+Json\?/,
      /model AuditLog\s*{[\s\S]*\bafter\s+Json\?/,
      /model AuditLog\s*{[\s\S]*\briskLevel\s+AuditRiskLevel\b/,
      /model Payment\s*{[\s\S]*\bnotes\s+String\?/,
      /model PaymentEvent\s*{[\s\S]*\bstatus\s+PaymentEventStatus\b/,
      /model PaymentEvent\s*{[\s\S]*\bheaders\s+Json\?/,
      /model PaymentEvent\s*{[\s\S]*\battemptCount\s+Int\b/,
      /model PaymentWebhookAttempt\s*{/,
      /model PushDevice\s*{/,
      /model PushDelivery\s*{/,
      /model GuardianConsentChallenge\s*{/,
      /model DataExportJob\s*{/,
      /model AccountDeletionJob\s*{/,
      /model IncidentLog\s*{/,
      /model ProviderHealthCheck\s*{/
    ];

    for (const pattern of requiredPatterns) {
      expect(schemaSource).toMatch(pattern);
    }
  });

  it("seeds pilot-ready examples for each hardened workflow", () => {
    const requiredPatterns = [
      /prisma\.payment\.create\(\{[\s\S]*notes:/,
      /prisma\.paymentEvent\.create\(/,
      /prisma\.paymentWebhookAttempt\.createMany\(/,
      /prisma\.pushDevice\.createManyAndReturn\(/,
      /prisma\.pushDelivery\.create\(/,
      /prisma\.guardianConsentChallenge\.create\(/,
      /prisma\.dataExportJob\.create\(/,
      /prisma\.accountDeletionJob\.create\(/,
      /prisma\.providerHealthCheck\.create\(/,
      /prisma\.incidentLog\.createMany\(/,
      /prisma\.auditLog\.createMany\(\{[\s\S]*riskLevel:/,
      /prisma\.auditLog\.createMany\(\{[\s\S]*before:/,
      /prisma\.auditLog\.createMany\(\{[\s\S]*after:/
    ];

    for (const pattern of requiredPatterns) {
      expect(seedSource).toMatch(pattern);
    }
  });
});
