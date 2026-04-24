import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface PushProvider extends DiagnosticProvider {
  sendPush(input: { userId: string; title: string; body: string; data?: Record<string, unknown> }): Promise<{ deliveryId: string; status: string }>;
  scheduleLocalReminder(input: { userId: string; title: string; body: string; at: Date }): Promise<{ reminderId: string; status: string }>;
  recordDelivery(input: { deliveryId: string; status: string; metadata?: Record<string, unknown> }): Promise<void>;
}

export class MockPushProvider implements PushProvider {
  deliveries: Array<{ deliveryId: string; status: string }> = [];

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

  async sendPush(input: { userId: string }): Promise<{ deliveryId: string; status: string }> {
    const deliveryId = `push_${input.userId}_${this.deliveries.length + 1}`;
    const result = { deliveryId, status: "mock_delivered" };
    this.deliveries.push(result);
    return result;
  }

  async scheduleLocalReminder(input: { userId: string }): Promise<{ reminderId: string; status: string }> {
    return { reminderId: `reminder_${input.userId}`, status: "mock_scheduled" };
  }

  async recordDelivery(input: { deliveryId: string; status: string }): Promise<void> {
    this.deliveries.push(input);
  }
}
