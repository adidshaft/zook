import { createHash, randomBytes, randomInt } from "node:crypto";
import type { EmailProvider } from "../providers/email";
import type { SmsProvider } from "../providers/sms";
import { getAllowedFixedOtp } from "../runtime-env";
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
  incrementOtpAttempt(id: string): Promise<void>;
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
  }): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
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
    if (challenge.expiresAt <= this.now()) {
      throw new Error("OTP expired");
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new Error("OTP attempts exceeded");
    }
    const devCodeAllowed = getAllowedFixedOtp() === input.code;
    const matches = challenge.codeHash === AuthService.hash(input.code) || devCodeAllowed;
    if (!matches) {
      await this.repo.incrementOtpAttempt(challenge.id);
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
    await this.consumeChallenge(input);
    const token = AuthService.createToken();
    const expiresAt = new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.repo.createSession({
      userId: input.userId,
      tokenHash: AuthService.hash(token),
      expiresAt,
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    });
    return { token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSession(AuthService.hash(token));
  }
}
