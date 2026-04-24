import { afterEach, describe, expect, it } from "vitest";
import {
  getAIProvider,
  getEmailProvider,
  getMapProvider,
  MockAIProvider,
  MockEmailProvider,
  MockMapProvider,
  OpenAIProvider,
  ResendEmailProvider
} from "../providers";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("provider registry", () => {
  it("returns mock providers by default", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAP_PROVIDER;
    delete process.env.GOOGLE_MAPS_API_KEY;

    expect(getAIProvider()).toBeInstanceOf(MockAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(MockMapProvider);
  });

  it("uses real providers only when env is configured", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test";

    expect(getAIProvider()).toBeInstanceOf(OpenAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });

  it("falls back safely when real provider keys are missing", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.MAP_PROVIDER = "google";

    expect(getAIProvider()).toBeInstanceOf(MockAIProvider);
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
    expect(getMapProvider()).toBeInstanceOf(MockMapProvider);
  });
});
