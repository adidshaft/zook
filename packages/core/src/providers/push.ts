import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export type PushPlatform = "ios" | "android" | "web" | "unknown";
export type PushEnvironment = "development" | "preview" | "production";

export interface RegisterDeviceInput {
  userId: string;
  token: string;
  organizationId?: string;
  platform?: PushPlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  environment?: PushEnvironment;
}

export interface PushSendInput {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  deliveryId: string;
  status: "queued" | "sent" | "failed" | "invalid_token";
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PushProvider extends DiagnosticProvider {
  readonly providerName: string;
  registerDevice(input: RegisterDeviceInput): Promise<{ status: "registered" | "invalid_token"; normalizedToken?: string }>;
  unregisterDevice(input: { token: string }): Promise<{ status: "unregistered" }>;
  sendPush(input: PushSendInput): Promise<PushSendResult>;
  sendBatch(input: PushSendInput[]): Promise<PushSendResult[]>;
  validateToken(input: { token: string }): Promise<{ valid: boolean; reason?: string }>;
}

export class MockPushProvider implements PushProvider {
  readonly providerName = "mock";
  deliveries: Array<PushSendResult> = [];

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        deliveryMode: "in-memory",
        deliveryCount: this.deliveries.length
      }
    };
  }

  async registerDevice(input: RegisterDeviceInput): Promise<{ status: "registered" | "invalid_token"; normalizedToken?: string }> {
    if (!input.token.trim()) {
      return { status: "invalid_token" };
    }
    return { status: "registered", normalizedToken: input.token.trim() };
  }

  async unregisterDevice(): Promise<{ status: "unregistered" }> {
    return { status: "unregistered" };
  }

  async sendPush(input: PushSendInput): Promise<PushSendResult> {
    const deliveryId = `push_${this.deliveries.length + 1}`;
    const result: PushSendResult = {
      deliveryId,
      status: input.token.trim() ? "sent" : "invalid_token"
    };
    this.deliveries.push(result);
    return result;
  }

  async sendBatch(input: PushSendInput[]): Promise<PushSendResult[]> {
    return Promise.all(input.map((entry) => this.sendPush(entry)));
  }

  async validateToken(input: { token: string }): Promise<{ valid: boolean; reason?: string }> {
    return input.token.trim() ? { valid: true } : { valid: false, reason: "Token is empty." };
  }
}

export class ExpoPushProvider implements PushProvider {
  readonly providerName = "expo";

  constructor(
    private readonly config: {
      accessToken?: string;
      projectId: string;
      environment: PushEnvironment;
    }
  ) {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "expo",
      mode: "live",
      configured: true,
      metadata: {
        projectIdConfigured: Boolean(this.config.projectId),
        environment: this.config.environment
      }
    };
  }

  async registerDevice(input: RegisterDeviceInput): Promise<{ status: "registered" | "invalid_token"; normalizedToken?: string }> {
    const validation = await this.validateToken({ token: input.token });
    if (!validation.valid) {
      return { status: "invalid_token" };
    }
    return { status: "registered", normalizedToken: input.token.trim() };
  }

  async unregisterDevice(): Promise<{ status: "unregistered" }> {
    return { status: "unregistered" };
  }

  async validateToken(input: { token: string }): Promise<{ valid: boolean; reason?: string }> {
    const token = input.token.trim();
    if (!token) {
      return { valid: false, reason: "Token is empty." };
    }
    const valid = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
    return valid ? { valid: true } : { valid: false, reason: "Token is not a valid Expo push token." };
  }

  async sendPush(input: PushSendInput): Promise<PushSendResult> {
    const result = await this.sendBatch([input]);
    return result[0] ?? { deliveryId: "expo_missing_result", status: "failed", errorMessage: "Expo did not return a push result." };
  }

  async sendBatch(input: PushSendInput[]): Promise<PushSendResult[]> {
    const messages = input.map((entry) => ({
      to: entry.token,
      title: entry.title,
      body: entry.body,
      data: entry.data ?? {}
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {})
      },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      return input.map((entry, index) => ({
        deliveryId: `expo_failed_${index + 1}`,
        status: "failed",
        errorCode: String(response.status),
        errorMessage: "Expo push request failed.",
        providerMessageId: entry.token
      }));
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string; status?: string; message?: string; details?: { error?: string } }>;
    };

    return input.map((entry, index) => {
      const item = payload.data?.[index];
      const isInvalidToken = item?.details?.error === "DeviceNotRegistered";
      return {
        deliveryId: item?.id ?? `expo_${index + 1}`,
        status: isInvalidToken ? "invalid_token" : item?.status === "ok" ? "sent" : "failed",
        ...(item?.id ? { providerMessageId: item.id } : {}),
        ...(item?.details?.error ? { errorCode: item.details.error } : {}),
        ...(item?.message ? { errorMessage: item.message } : {})
      } satisfies PushSendResult;
    });
  }
}
