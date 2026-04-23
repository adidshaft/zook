import { createHash, randomBytes } from "node:crypto";
import type { EmailProvider } from "../providers/email";

export interface OtpChallengeRecord {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  consumedAt?: Date;
  expiresAt: Date;
}

export interface AuthRepository {
  createOtp(input: Omit<OtpChallengeRecord, "id" | "attempts" | "resendCount">): Promise<OtpChallengeRecord>;
  findLatestOtp(email: string): Promise<OtpChallengeRecord | undefined>;
  incrementOtpAttempt(id: string): Promise<void>;
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

  async requestOtp(email: string): Promise<OtpChallengeRecord> {
    const code = process.env.NODE_ENV === "development" ? (process.env.ZOOK_MOCK_OTP ?? "000000") : randomBytes(3).toString("hex").slice(0, 6);
    const expiresAt = new Date(this.now().getTime() + 10 * 60 * 1000);
    const challenge = await this.repo.createOtp({
      email,
      codeHash: AuthService.hash(code),
      maxAttempts: 5,
      expiresAt
    });
    await this.emailProvider.sendOtp({ email, code, expiresAt });
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
    const devCodeAllowed = process.env.NODE_ENV === "development" && input.code === (process.env.ZOOK_MOCK_OTP ?? "000000");
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
