import { MockAIProvider, OpenAIProvider, type AIProvider } from "./ai";
import { MockEmailProvider, ResendEmailProvider, type EmailProvider } from "./email";
import { GoogleMapProvider, MockMapProvider, type MapProvider } from "./map";
import { MockPaymentProvider, type PaymentProvider } from "./payment";
import { MockPushProvider, type PushProvider } from "./push";
import { LocalStorageProvider, type StorageProvider } from "./storage";

function env(value: string | undefined) {
  return value?.trim() || undefined;
}

export function getEmailProvider(): EmailProvider {
  const provider = env(process.env.EMAIL_PROVIDER) ?? "mock";
  if (provider === "resend") {
    const apiKey = env(process.env.RESEND_API_KEY);
    if (apiKey) {
      return new ResendEmailProvider(apiKey);
    }
  }
  return new MockEmailProvider();
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

export function getMapProvider(): MapProvider {
  const provider = env(process.env.MAP_PROVIDER) ?? "mock";
  const apiKey = env(process.env.GOOGLE_MAPS_API_KEY);
  if (provider === "google" && apiKey) {
    return new GoogleMapProvider(apiKey);
  }
  return new MockMapProvider();
}

export function getAIProvider(): AIProvider {
  const provider = env(process.env.AI_PROVIDER) ?? "mock";
  const apiKey = env(process.env.OPENAI_API_KEY);
  if (provider === "openai" && apiKey) {
    return new OpenAIProvider(apiKey);
  }
  return new MockAIProvider();
}

export function getStorageProvider(): StorageProvider {
  return new LocalStorageProvider();
}

export function getPushProvider(): PushProvider {
  return new MockPushProvider();
}
