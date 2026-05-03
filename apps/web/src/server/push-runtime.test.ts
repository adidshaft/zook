import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliverPushForNotification } from "./push-runtime";

const mocks = vi.hoisted(() => ({
  diagnostics: {
    status: "disabled",
    selectedProvider: "disabled",
    missingEnv: [] as string[]
  },
  getPushProvider: vi.fn(),
  userNotificationPreferenceFindMany: vi.fn(),
  pushDeviceFindMany: vi.fn(),
  notificationRecipientFindMany: vi.fn(),
  pushDeliveryCreateMany: vi.fn()
}));

vi.mock("@zook/core/providers", () => ({
  getPushProviderDiagnostics: () => mocks.diagnostics,
  getPushProvider: mocks.getPushProvider
}));

vi.mock("@zook/db", () => ({
  prisma: {
    userNotificationPreference: {
      findMany: mocks.userNotificationPreferenceFindMany
    },
    pushDevice: {
      findMany: mocks.pushDeviceFindMany
    },
    notificationRecipient: {
      findMany: mocks.notificationRecipientFindMany
    },
    pushDelivery: {
      createMany: mocks.pushDeliveryCreateMany
    }
  }
}));

describe("deliverPushForNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.diagnostics.status = "disabled";
    mocks.diagnostics.selectedProvider = "disabled";
    mocks.diagnostics.missingEnv = [];
    mocks.getPushProvider.mockImplementation(() => {
      throw new Error("Push provider should not be resolved when diagnostics are disabled.");
    });
    mocks.userNotificationPreferenceFindMany.mockResolvedValue([
      { userId: "user_1", orgId: "org_1", pushEnabled: true }
    ]);
    mocks.pushDeviceFindMany.mockResolvedValue([
      {
        id: "device_1",
        userId: "user_1",
        token: "ExponentPushToken[test]",
        status: "ACTIVE"
      }
    ]);
    mocks.notificationRecipientFindMany.mockResolvedValue([
      { id: "recipient_1", userId: "user_1", notificationId: "notification_1" }
    ]);
    mocks.pushDeliveryCreateMany.mockResolvedValue({ count: 1 });
  });

  it("records provider-disabled delivery attempts without crashing in-app notification delivery", async () => {
    const result = await deliverPushForNotification({
      orgId: "org_1",
      notification: {
        id: "notification_1",
        type: "TRANSACTIONAL",
        title: "Membership activated",
        body: "Your membership is active.",
        pushEnabled: true,
        metadata: { subscriptionId: "sub_1" }
      },
      userIds: ["user_1"]
    });

    expect(result).toEqual({ attempted: false, eligibleUsers: 1, deliveries: 1 });
    expect(mocks.getPushProvider).not.toHaveBeenCalled();
    expect(mocks.pushDeliveryCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          notificationId: "notification_1",
          notificationRecipientId: "recipient_1",
          userId: "user_1",
          deviceId: "device_1",
          provider: "disabled",
          status: "FAILED",
          attemptCount: 1,
          failureCode: "provider_disabled",
          failureReason: "Push provider is disabled for this environment."
        })
      ]
    });
  });

  it("records provider send exceptions as failed deliveries", async () => {
    mocks.diagnostics.status = "ready";
    mocks.diagnostics.selectedProvider = "expo";
    mocks.getPushProvider.mockReturnValue({
      providerName: "expo",
      sendBatch: vi.fn().mockRejectedValue(new Error("network down"))
    });

    const result = await deliverPushForNotification({
      orgId: "org_1",
      notification: {
        id: "notification_1",
        type: "PLAN",
        title: "Plan assigned",
        body: "A new plan is ready.",
        pushEnabled: true,
        metadata: { assignmentId: "assign_1" }
      },
      userIds: ["user_1"]
    });

    expect(result).toEqual({ attempted: true, eligibleUsers: 1, deliveries: 1 });
    expect(mocks.pushDeliveryCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          provider: "expo",
          status: "FAILED",
          failureCode: "provider_exception",
          failureReason: "Push provider send failed."
        })
      ]
    });
  });
});
