import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "../providers/email";
import { AuthService, type AuthRepository, type OtpChallengeRecord } from "../services";

class InMemoryAuthRepo implements AuthRepository {
  challenges: OtpChallengeRecord[] = [];
  sessions: Array<{ userId: string; tokenHash: string; expiresAt: Date; revokedAt?: Date }> = [];

  async createOtp(input: Omit<OtpChallengeRecord, "id" | "attempts" | "resendCount">): Promise<OtpChallengeRecord> {
    const record: OtpChallengeRecord = {
      id: `otp_${this.challenges.length + 1}`,
      attempts: 0,
      resendCount: 0,
      ...input
    };
    this.challenges.push(record);
    return record;
  }

  async findLatestOtp(email: string): Promise<OtpChallengeRecord | undefined> {
    return [...this.challenges].reverse().find((challenge) => challenge.email === email);
  }

  async incrementOtpAttempt(id: string): Promise<void> {
    const challenge = this.challenges.find((item) => item.id === id);
    if (challenge) {
      challenge.attempts += 1;
    }
  }

  async refreshOtp(input: { id: string; codeHash: string; expiresAt: Date; ipAddress?: string }): Promise<OtpChallengeRecord> {
    const challenge = this.challenges.find((item) => item.id === input.id);
    if (!challenge) {
      throw new Error("OTP not found");
    }
    challenge.codeHash = input.codeHash;
    challenge.expiresAt = input.expiresAt;
    challenge.attempts = 0;
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

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
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
  let repo: InMemoryAuthRepo;
  let emailProvider: MockEmailProvider;
  let now: Date;

  beforeEach(() => {
    repo = new InMemoryAuthRepo();
    emailProvider = new MockEmailProvider();
    now = new Date("2026-04-24T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.NODE_ENV = "development";
    process.env.OTP_FIXED_CODE_DEV = "000000";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.OTP_FIXED_CODE_DEV;
  });

  it("request otp creates a challenge and sends email", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    const challenge = await service.requestOtp(email);

    expect(challenge.email).toBe(email);
    expect(repo.challenges).toHaveLength(1);
    expect(emailProvider.sent[0]).toMatchObject({ kind: "otp", email, code: "000000" });
  });

  it("verify otp creates a session", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);

    const session = await service.verifyOtp({ email, code: "000000", userId: "user_1" });
    expect(session.token).toBeTruthy();
    expect(repo.sessions).toHaveLength(1);
  });

  it("invalid otp fails and increments attempts", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);

    await expect(service.verifyOtp({ email, code: "123456", userId: "user_1" })).rejects.toThrow("Invalid OTP");
    expect(repo.challenges[0]?.attempts).toBe(1);
  });

  it("expired otp fails", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);
    vi.advanceTimersByTime(11 * 60 * 1000);

    await expect(service.verifyOtp({ email, code: "000000", userId: "user_1" })).rejects.toThrow("OTP expired");
  });

  it("logout revokes the session token hash", async () => {
    const service = new AuthService(repo, emailProvider, () => new Date());
    await service.requestOtp(email);
    const session = await service.verifyOtp({ email, code: "000000", userId: "user_1" });

    await service.logout(session.token);

    expect(repo.sessions[0]?.revokedAt).toBeTruthy();
  });
});
