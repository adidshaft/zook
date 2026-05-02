import { createHash, randomBytes, randomInt } from "node:crypto";
import type { EmailProvider } from "../providers/email";
import { getAllowedFixedOtp } from "../runtime-env";

export interface OtpChallengeRecord {
  id: string;
  email: string;
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
  createOtp(input: Omit<OtpChallengeRecord, "id" | "attempts" | "resendCount">): Promise<OtpChallengeRecord>;
  findLatestOtp(email: string): Promise<OtpChallengeRecord | undefined>;
  incrementOtpAttempt(id: string): Promise<void>;
  refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }): Promise<OtpChallengeRecord>;
  consumeOtp(id: string): Promise<void>;
  createSession(input: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string; ipAddress?: string }): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
}

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly emailProvider: EmailProvider,
    private readonly now: () => Date = () => new Date(),
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

  async requestOtp(email: string, input: { ipAddress?: string } = {}): Promise<OtpChallengeRecord> {
    const code = this.createOtpCode();
    const expiresAt = new Date(this.now().getTime() + 10 * 60 * 1000);
    const latest = await this.repo.findLatestOtp(email);
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
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {})
      });
      await this.emailProvider.sendOtpEmail({ to: email, code, expiresAt, purpose: "login" });
      return refreshed;
    }
    const challenge = await this.repo.createOtp({
      email,
      codeHash: AuthService.hash(code),
      maxAttempts: 5,
      expiresAt,
      createdAt: this.now(),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {})
    });
    await this.emailProvider.sendOtpEmail({ to: email, code, expiresAt, purpose: "login" });
    return challenge;
  }

  async verifyOtp(input: { email: string; code: string; userId: string; userAgent?: string; ipAddress?: string }): Promise<{ token: string; expiresAt: Date }> {
    const challenge = await this.repo.findLatestOtp(input.email);
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
    const token = AuthService.createToken();
    const expiresAt = new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.repo.createSession({
      userId: input.userId,
      tokenHash: AuthService.hash(token),
      expiresAt,
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {})
    });
    return { token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSession(AuthService.hash(token));
  }
}
