import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("notifications actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner creates a template, sends a selected-member broadcast, and member can mark it read", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await prisma.user.create({
      data: {
        email: `notification-recipient-${Date.now()}@zook.local`,
        name: "Notification Recipient",
        marketingOptIn: true,
      },
    });
    await prisma.organizationUser.create({
      data: { orgId: org.id, userId: member.id, status: "active" },
    });
    const templateName = `Holiday Template ${Date.now()}`;
    const title = `Holiday hours ${Date.now()}`;

    const template = await expectApiOk<{ template: { id: string; name: string } }>(
      await page.request.post(`/api/orgs/${org.id}/notifications/templates`, {
        data: {
          name: templateName,
          type: "OPERATIONAL",
          title: "Holiday hours updated",
          body: "Hi {{member.firstName}}, holiday hours are updated.",
        },
      }),
    );
    expect(template.data.template.name).toBe(templateName);

    const notification = await expectApiOk<{
      notification: { id: string; status: string };
      recipientCount: number;
    }>(
      await page.request.post(`/api/orgs/${org.id}/notifications`, {
        data: {
          title,
          body: "The gym will open late tomorrow.",
          type: "OPERATIONAL",
          audience: "selected_members",
          selectedUserIds: [member.id],
          templateId: template.data.template.id,
          pushEnabled: false,
        },
      }),
    );
    expect(notification.data).toMatchObject({ recipientCount: 1 });
    expect(notification.data.notification.status).toBe("SENT");
    await expect(
      prisma.notificationRecipient.findUnique({
        where: {
          notificationId_userId: {
            notificationId: notification.data.notification.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.toBeTruthy();

    const recipients = await expectApiOk<{ recipients: Array<{ userId: string }> }>(
      await page.request.get(
        `/api/orgs/${org.id}/notifications/${notification.data.notification.id}/recipients`,
      ),
    );
    expect(recipients.data.recipients.map((recipient) => recipient.userId)).toContain(member.id);

    await loginWithSessionCookie(page, member.email);
    const memberNotifications = await expectApiOk<{
      notifications: Array<{
        id: string;
        notificationId: string;
        readAt?: string | null;
      }>;
    }>(await page.request.get("/api/me/notifications"));
    const sent = memberNotifications.data.notifications.find(
      (item) => item.notificationId === notification.data.notification.id,
    );
    expect(sent).toBeTruthy();
    await expectApiOk(await page.request.post(`/api/me/notifications/${sent!.id}/read`));
    await expect(
      prisma.notificationRecipient.findUnique({
        where: {
          notificationId_userId: {
            notificationId: notification.data.notification.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.toMatchObject({ readAt: expect.any(Date) });
  });

  test("future scheduled notification persists as scheduled history", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payload = await expectApiOk<{ notification: { id: string; status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/notifications`, {
        data: {
          title: `Scheduled notice ${Date.now()}`,
          body: "This is scheduled for tomorrow.",
          type: "OPERATIONAL",
          audience: "selected_members",
          selectedUserIds: [member.id],
          scheduleAt: scheduledAt,
          pushEnabled: false,
        },
      }),
    );
    expect(payload.data.notification.status).toBe("SCHEDULED");

    await page.goto("/dashboard/notifications/history");
    await expect(page.getByRole("heading", { name: /Notifications \/ History/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
