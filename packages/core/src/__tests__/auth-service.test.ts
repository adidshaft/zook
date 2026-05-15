import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "../providers/email";
import { MockSmsProvider } from "../providers/sms";
import { AuthService, type AuthRepository, type OtpChallengeRecord } from "../services";

class InMemoryAuthRepo implements AuthRepository {
  challenges: OtpChallengeRecord[] = [];
  sessions: Array<{
    userId: string;
    tokenHash: string;
    refreshTokenHash?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
    revokedAt?: Date;
  }> = [];

  async createOtp(
    input: Omit<OtpChallengeRecord, "id" | "attempts" | "resendCount" | "ipFailureCount">,
  ): Promise<OtpChallengeRecord> {
    const record: OtpChallengeRecord = {
      id: `otp_${this.challenges.length + 1}`,
      attempts: 0,
      resendCount: 0,
      ipFailureCount: 0,
      ...input,
    };
    this.challenges.push(record);
    return record;
  }

  async findLatestOtp(
    identifier: string,
    purpose = "login",
  ): Promise<OtpChallengeRecord | undefined> {
    return [...this.challenges]
      .reverse()
      .find((challenge) => challenge.identifier === identifier && challenge.purpose === purpose);
  }

  async recordOtpFailure(input: {
    id: string;
    failureCount: number;
    lockedUntil?: Date;
  }): Promise<void> {
    const challenge = this.challenges.find((item) => item.id === input.id);
    if (challenge) {
      challenge.attempts += 1;
      challenge.ipFailureCount = input.failureCount;
      if (input.lockedUntil) {
        challenge.lockedUntil = input.lockedUntil;
      } else {
        delete challenge.lockedUntil;
      }
    }
  }

  async refreshOtp(input: {
    id: string;
    codeHash: string;
    expiresAt: Date;
    ipAddress?: string;
  }): Promise<OtpChallengeRecord> {
    const challenge = this.challenges.find((item) => item.id === input.id);
    if (!challenge) {
      throw new Error("OTP not found");
    }
    challenge.codeHash = input.codeHash;
    challenge.expiresAt = input.expiresAt;
    challenge.attempts = 0;
    challenge.ipFailureCount = 0;
    delete challenge.lockedUntil;
    challenge.resendCount += 1;
    challenge.createdAt = new Date();
    return challenge;
  }

  async consumeOtp(id: string): Promise<void> {
    const challenge = this.challenges.find((item) => item.id === id);
    if (challenge) {
      challenge.consumedAt = new Date();
    }
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    refreshTokenHash?: string;
    expiresAt: Date;
    refreshExpiresAt?: Date;
  }): Promise<void> {
    this.sessions.push({ ...input });
  }

  async revokeSession(tokenHash: string): Promise<void> {
    const session = this.sessions.find((item) => item.tokenHash === tokenHash);
    if (session) {
      session.revokedAt = new Date();
    }
  }
}

describe("auth service", () => {
  const email = "member@zook.local";
  const phone = "+919876543210";
  let repo: InMemoryAuthRepo;
  let emailProvider: MockEmailProvider;
  let smsProvider: MockSmsProvider;
  let now: Date;

  beforeEach(() => {
    repo = new InMemoryAuthRepo();
    emailProvider = new MockEmailProvider();
    smsProvider = new MockSmsProvider();
    now = new Date("2026-04-24T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.NODE_ENV = "development";
    process.env.OTP_FIXED_CODE_DEV = "000000";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.OTP_FIXED_CODE_DEV;
    delete process.env.APP_ENV;
  });

  it("request otp creates a challenge and sends email", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    const challenge = await service.requestOtp(email);

    expect(challenge.email).toBe(email);
    expect(challenge.identifier).toBe(email);
    expect(challenge.channel).toBe("email");
    expect(challenge.purpose).toBe("login");
    expect(repo.challenges).toHaveLength(1);
    expect(emailProvider.sent[0]).toMatchObject({ kind: "otp", email, code: "000000" });
  });

  it("request otp sends sms for phone identifiers", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date(), smsProvider);
    const challenge = await service.requestOtp(phone);

    expect(challenge.identifier).toBe(phone);
    expect(challenge.channel).toBe("phone");
    expect(challenge.phone).toBe(phone);
    expect(smsProvider.sent[0]).toMatchObject({ phone, code: "000000" });
    expect(emailProvider.sent).toHaveLength(0);
  });

  it("verifies contact-update challenges without creating sessions", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email, { purpose: "contact_update:user_1:email" });

    const challenge = await service.verifyOtpChallenge({
      identifier: email,
      code: "000000",
      purpose: "contact_update:user_1:email",
    });

    expect(challenge.consumedAt).toBeTruthy();
    expect(repo.sessions).toHaveLength(0);
  });

  it("verify otp creates a session", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);

    const session = await service.verifyOtp({
      identifier: email,
      code: "000000",
      userId: "user_1",
    });
    expect(session.token).toBeTruthy();
    expect(repo.sessions).toHaveLength(1);
  });

  it("rejects a leaked fixed otp in production before creating a session", async () => {
    process.env.APP_ENV = "production";
    process.env.OTP_FIXED_CODE_DEV = "000000";
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);

    await expect(
      service.verifyOtp({
        identifier: email,
        code: "000000",
        userId: "user_1",
        ipAddress: "203.0.113.10",
        userAgent: "vitest",
      }),
    ).rejects.toThrow("Fixed OTP is disabled in production");
    expect(repo.sessions).toHaveLength(0);
  });

  it("invalid otp fails and increments attempts", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);

    await expect(
      service.verifyOtp({ identifier: email, code: "123456", userId: "user_1" }),
    ).rejects.toThrow("Invalid OTP");
    expect(repo.challenges[0]?.attempts).toBe(1);
  });

  it("temporarily locks repeated invalid otp attempts and sends a suspicious activity email", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);
    if (repo.challenges[0]) {
      repo.challenges[0].expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.verifyOtp({ identifier: email, code: "123456", userId: "user_1" }),
      ).rejects.toThrow("Invalid OTP");
      if (attempt < 4) {
        vi.advanceTimersByTime(16 * 60 * 1000);
      }
    }

    expect(repo.challenges[0]?.attempts).toBe(5);
    expect(repo.challenges[0]?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    expect(emailProvider.sent.some((event) => event.kind === "notification")).toBe(true);
  });

  it("expired otp fails", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);
    vi.advanceTimersByTime(11 * 60 * 1000);

    await expect(
      service.verifyOtp({ identifier: email, code: "000000", userId: "user_1" }),
    ).rejects.toThrow("OTP expired");
  });

  it("logout revokes the session token hash", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);
    const session = await service.verifyOtp({
      identifier: email,
      code: "000000",
      userId: "user_1",
    });

    await service.logout(session.token);

    expect(repo.sessions[0]?.revokedAt).toBeTruthy();
  });
});
