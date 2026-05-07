import { createHash, randomBytes, randomInt } from "node:crypto";
import type { EmailProvider } from "../providers/email";
import type { SmsProvider } from "../providers/sms";
import { getAllowedFixedOtp, getAppEnv } from "../runtime-env";
import { normalizeLoginIdentifier, type LoginIdentifier } from "../validators";

export interface OtpChallengeRecord {
  id: string;
  email: string;
  identifier: string;
  channel: LoginIdentifier["kind"];
  phone?: string;
  purpose: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  ipFailureCount?: number;
  lockedUntil?: Date;
  ipAddress?: string;
  consumedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthRepository {
  createOtp(
    input: Omit<OtpChallengeRecord, "id" | "attempts" | "resendCount">,
  ): Promise<OtpChallengeRecord>;
  findLatestOtp(identifier: string, purpose?: string): Promise<OtpChallengeRecord | undefined>;
  recordOtpFailure(input: { id: string; failureCount: number; lockedUntil?: Date }): Promise<void>;
  refreshOtp(input: {
    id: string;
    codeHash: string;
    expiresAt: Date;
    ipAddress?: string;
  }): Promise<OtpChallengeRecord>;
  consumeOtp(id: string): Promise<void>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    deviceFingerprintHash?: string;
  }): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  recordSecurityEvent?(input: {
    action: string;
    userId?: string;
    identifier?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly emailProvider: EmailProvider,
    private readonly now: () => Date = () => new Date(),
    private readonly smsProvider?: SmsProvider,
  ) {}

  static hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  static createToken(): string {
    return randomBytes(32).toString("base64url");
  }

  static createDeviceFingerprint(input: { userAgent?: string; ipAddress?: string }): string {
    return AuthService.hash(`${input.userAgent ?? "unknown-user-agent"}:${input.ipAddress ?? "unknown-ip"}`);
  }

  private createOtpCode(): string {
    const fixedCode = getAllowedFixedOtp();
    if (fixedCode) {
      return fixedCode;
    }
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
  }

  private async deliverOtp(identifier: LoginIdentifier, code: string, expiresAt: Date) {
    if (identifier.kind === "email") {
      await this.emailProvider.sendOtpEmail({
        to: identifier.value,
        code,
        expiresAt,
        purpose: "login",
      });
      return;
    }
    if (!this.smsProvider) {
      throw new Error("SMS provider is not configured.");
    }
    await this.smsProvider.sendOtp({ phone: identifier.value, code, expiresAt });
  }

  private lockUntilForFailureCount(failureCount: number) {
    if (failureCount >= 5) {
      return new Date(this.now().getTime() + 24 * 60 * 60 * 1000);
    }
    if (failureCount >= 4) {
      return new Date(this.now().getTime() + 15 * 60 * 1000);
    }
    if (failureCount >= 3) {
      return new Date(this.now().getTime() + 5 * 60 * 1000);
    }
    return undefined;
  }

  private async sendSuspiciousActivityNotice(identifier: LoginIdentifier) {
    if (identifier.kind !== "email") {
      return;
    }
    await this.emailProvider.sendNotificationEmail({
      to: identifier.value,
      title: "Suspicious sign-in activity blocked",
      body: "We blocked additional OTP attempts for your Zook account for 24 hours after repeated failed verification attempts. If this was not you, no action is needed.",
      variant: "generic",
    });
  }

  async requestOtp(
    rawIdentifier: LoginIdentifier | string,
    input: { ipAddress?: string; purpose?: string } = {},
  ): Promise<OtpChallengeRecord> {
    const identifier =
      typeof rawIdentifier === "string" ? normalizeLoginIdentifier(rawIdentifier) : rawIdentifier;
    const purpose = input.purpose ?? "login";
    const code = this.createOtpCode();
    const expiresAt = new Date(this.now().getTime() + 10 * 60 * 1000);
    const latest = await this.repo.findLatestOtp(identifier.value, purpose);
    if (latest && !latest.consumedAt && latest.expiresAt > this.now()) {
      if (latest.resendCount >= 3) {
        throw new Error("OTP resend limit reached");
      }
      if (latest.createdAt.getTime() + 30_000 > this.now().getTime()) {
        throw new Error("OTP resend available in a few seconds");
      }
      const refreshed = await this.repo.refreshOtp({
        id: latest.id,
        codeHash: AuthService.hash(code),
        expiresAt,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      });
      await this.deliverOtp(identifier, code, expiresAt);
      return refreshed;
    }
    const challenge = await this.repo.createOtp({
      email: identifier.value,
      identifier: identifier.value,
      channel: identifier.kind,
      ...(identifier.kind === "phone" ? { phone: identifier.value } : {}),
      purpose,
      codeHash: AuthService.hash(code),
      maxAttempts: 5,
      expiresAt,
      createdAt: this.now(),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    });
    await this.deliverOtp(identifier, code, expiresAt);
    return challenge;
  }

  private async consumeChallenge(input: {
    identifier: LoginIdentifier | string;
    code: string;
    purpose?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const identifier =
      typeof input.identifier === "string"
        ? normalizeLoginIdentifier(input.identifier)
        : input.identifier;
    const challenge = await this.repo.findLatestOtp(identifier.value, input.purpose ?? "login");
    if (!challenge) {
      throw new Error("OTP not found");
    }
    if (challenge.consumedAt) {
      throw new Error("OTP already consumed");
    }
    if (challenge.lockedUntil && challenge.lockedUntil > this.now()) {
      throw new Error("OTP temporarily locked. Try again later.");
    }
    if (challenge.expiresAt <= this.now()) {
      throw new Error("OTP expired");
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new Error("OTP attempts exceeded");
    }
    const devCodeAllowed = getAllowedFixedOtp() === input.code;
    const matches = challenge.codeHash === AuthService.hash(input.code) || devCodeAllowed;
    if (!matches) {
      const failureCount = challenge.attempts + 1;
      const lockedUntil = this.lockUntilForFailureCount(failureCount);
      await this.repo.recordOtpFailure({
        id: challenge.id,
        failureCount,
        ...(lockedUntil ? { lockedUntil } : {}),
      });
      await this.repo.recordSecurityEvent?.({
        action: "auth.otp_failed",
        identifier: identifier.value,
        ...(input.ipAddress ?? challenge.ipAddress ? { ipAddress: input.ipAddress ?? challenge.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        metadata: { failureCount, locked: Boolean(lockedUntil) },
      });
      if (failureCount >= 5) {
        await this.sendSuspiciousActivityNotice(identifier);
      }
      throw new Error("Invalid OTP");
    }
    await this.repo.consumeOtp(challenge.id);
    return challenge;
  }

  async verifyOtpChallenge(input: {
    identifier: LoginIdentifier | string;
    code: string;
    purpose?: string;
  }): Promise<OtpChallengeRecord> {
    return this.consumeChallenge(input);
  }

  async verifyOtp(input: {
    identifier: LoginIdentifier | string;
    code: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ token: string; expiresAt: Date }> {
    const fixedOtp = process.env.OTP_FIXED_CODE_DEV?.trim();
    if (fixedOtp && getAppEnv() === "production" && input.code === fixedOtp) {
      await this.repo.recordSecurityEvent?.({
        action: "auth.fixed_otp_rejected",
        userId: input.userId,
        identifier:
          typeof input.identifier === "string" ? input.identifier : input.identifier.value,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        metadata: { reason: "fixed_otp_presented_in_production" },
      });
      throw new Error("Fixed OTP is disabled in production");
    }
    await this.consumeChallenge(input);
    const token = AuthService.createToken();
    const expiresAt = new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.repo.createSession({
      userId: input.userId,
      tokenHash: AuthService.hash(token),
      expiresAt,
      deviceFingerprintHash: AuthService.createDeviceFingerprint(input),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    });
    return { token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSession(AuthService.hash(token));
  }
}
