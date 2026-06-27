import {
  getPushProvider,
  getPushProviderDiagnostics,
  getWhatsAppProvider,
  getWhatsAppProviderDiagnostics,
  normalizeWhatsAppPhone,
} from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth } from "../access";
import { notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import { assertActiveContextOrg, clean, pathMatches } from "./core";

const pushRegisterDeviceSchema = z.object({
  orgId: z.string().optional(),
  token: z.string().trim().min(10),
  platform: z.enum(["ios", "android", "web", "unknown"]).default("unknown"),
  deviceId: z.string().trim().max(120).optional(),
  deviceName: z.string().trim().max(120).optional(),
  appVersion: z.string().trim().max(50).optional(),
  environment: z.enum(["development", "preview", "production"]).default("development"),
});

const pushUnregisterDeviceSchema = z.object({
  token: z.string().trim().min(10).optional(),
});

const whatsappRegisterDeviceSchema = z.object({
  orgId: z.string().optional(),
  phone: z.string().trim().min(8).max(20),
  deviceId: z.string().trim().max(120).optional(),
  deviceName: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(80).optional(),
});

const whatsappUnregisterDeviceSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

const meWhatsAppDeviceSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  orgId: z.string().optional(),
});

function getPushProviderOrThrow() {
  const diagnostics = getPushProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("Push alerts are not available right now.");
  }
  return getPushProvider();
}

function getWhatsAppProviderOrThrow() {
  const diagnostics = getWhatsAppProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("WhatsApp alerts are not available right now.");
  }
  return getWhatsAppProvider();
}

function normalizeIndianWhatsAppPhone(phone: string) {
  const digits = phone.trim().replace(/\D/g, "");
  if (digits.length === 10) {
    return normalizeWhatsAppPhone(digits);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return normalizeWhatsAppPhone(`+${digits}`);
  }
  return "";
}

export async function handlePushDevices(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["push", "register-device"])) {
    const body = pushRegisterDeviceSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    await assertRateLimit(
      "pushRegisterByActor",
      `${body.orgId ?? "global"}:${userId}`,
      "Too many push device registrations from this account.",
    );
    const provider = getPushProviderOrThrow();
    const registration = await provider.registerDevice({
      userId,
      token: body.token,
      ...(body.orgId ? { organizationId: body.orgId } : {}),
      platform: body.platform,
      ...(body.deviceId ? { deviceId: body.deviceId } : {}),
      ...(body.deviceName ? { deviceName: body.deviceName } : {}),
      ...(body.appVersion ? { appVersion: body.appVersion } : {}),
      environment: body.environment,
    });
    if (registration.status === "invalid_token" || !registration.normalizedToken) {
      throw validationError("Push alerts are not available for this device.");
    }
    const normalizedPlatform =
      body.platform === "ios"
        ? "IOS"
        : body.platform === "android"
          ? "ANDROID"
          : body.platform === "web"
            ? "WEB"
            : "WEB";
    const device = await prisma.pushDevice.upsert({
      where: {
        provider_token: {
          provider: provider.providerName,
          token: registration.normalizedToken,
        },
      },
      update: clean({
        orgId: null,
        userId,
        platform: normalizedPlatform,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        appVersion: body.appVersion,
        metadata: clean({
          environment: body.environment,
          activeOrgId: body.orgId,
        }) as Prisma.InputJsonValue,
        revokedAt: null,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
        failureReason: null,
      }),
      create: clean({
        orgId: null,
        userId,
        provider: provider.providerName,
        token: registration.normalizedToken,
        platform: normalizedPlatform,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        appVersion: body.appVersion,
        metadata: clean({
          environment: body.environment,
          activeOrgId: body.orgId,
        }) as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
      }),
    });
    return ok({ device });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "unregister-device"])) {
    const body = pushUnregisterDeviceSchema.parse(await readJson(request));
    if (!body.token) {
      throw validationError("A push token is required to unregister the device.");
    }
    const userId = requireAuth(await getRequestContext(request));
    const device = await prisma.pushDevice.findFirst({
      where: { userId, token: body.token, revokedAt: null },
    });
    if (!device) {
      throw notFoundError("Push device not found");
    }
    const diagnostics = getPushProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getPushProvider().unregisterDevice({ token: device.token });
    }
    await prisma.pushDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ unregistered: true, deviceId: device.id });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "push-devices"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      devices: await prisma.pushDevice.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "push-devices", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const device = await prisma.pushDevice.findFirst({
      where: { id: path[2]!, userId },
    });
    if (!device) {
      throw notFoundError("Push device not found");
    }
    const diagnostics = getPushProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getPushProvider().unregisterDevice({ token: device.token });
    }
    const updated = await prisma.pushDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ device: updated });
  }
  if (request.method === "GET" && pathMatches(path, ["me", "whatsapp-devices"])) {
    const userId = requireAuth(await getRequestContext(request));
    return ok({
      devices: await prisma.whatsAppDevice.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["me", "whatsapp-devices"])) {
    const body = meWhatsAppDeviceSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    await assertRateLimit(
      "pushRegisterByActor",
      `${body.orgId ?? "global"}:${userId}:me-whatsapp`,
      "Too many WhatsApp registrations from this account.",
    );
    const normalizedPhone = normalizeIndianWhatsAppPhone(body.phone);
    if (!normalizedPhone) {
      throw validationError("Enter a valid Indian WhatsApp phone number.");
    }
    // TODO: Require OTP verification once WhatsApp Business API onboarding is complete.
    const device = await prisma.whatsAppDevice.upsert({
      where: {
        provider_phone_userId: {
          provider: "manual",
          phone: normalizedPhone,
          userId,
        },
      },
      update: clean({
        orgId: body.orgId ?? null,
        status: "ACTIVE",
        optedInAt: new Date(),
        revokedAt: null,
        failureReason: null,
        lastRegisteredAt: new Date(),
        lastSeenAt: new Date(),
      }),
      create: clean({
        orgId: body.orgId ?? null,
        userId,
        provider: "manual",
        phone: normalizedPhone,
        status: "ACTIVE",
        optedInAt: new Date(),
        lastRegisteredAt: new Date(),
        lastSeenAt: new Date(),
      }),
    });
    return ok({ device });
  }
  if (request.method === "DELETE" && pathMatches(path, ["me", "whatsapp-devices", /.+/])) {
    const userId = requireAuth(await getRequestContext(request));
    const device = await prisma.whatsAppDevice.findFirst({
      where: { id: path[2]!, userId },
    });
    if (!device) {
      throw notFoundError("WhatsApp device not found");
    }
    const updated = await prisma.whatsAppDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ device: updated });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "whatsapp-register"])) {
    const body = whatsappRegisterDeviceSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    await assertRateLimit(
      "pushRegisterByActor",
      `${body.orgId ?? "global"}:${userId}:whatsapp`,
      "Too many WhatsApp registrations from this account.",
    );
    const provider = getWhatsAppProviderOrThrow();
    const registration = await provider.registerDevice({
      userId,
      phone: body.phone,
      ...(body.orgId ? { organizationId: body.orgId } : {}),
      ...(body.deviceId ? { deviceId: body.deviceId } : {}),
      ...(body.deviceName ? { deviceName: body.deviceName } : {}),
      ...(body.locale ? { locale: body.locale } : {}),
      ...(body.timezone ? { timezone: body.timezone } : {}),
    });
    if (registration.status === "invalid_phone" || !registration.normalizedPhone) {
      throw validationError("WhatsApp alerts are not available for this phone number.");
    }
    const device = await prisma.whatsAppDevice.upsert({
      where: {
        provider_phone_userId: {
          provider: provider.providerName,
          phone: registration.normalizedPhone,
          userId,
        },
      },
      update: clean({
        orgId: body.orgId ?? null,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        locale: body.locale,
        timezone: body.timezone,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
        optedInAt: new Date(),
        revokedAt: null,
        failureReason: null,
      }),
      create: clean({
        orgId: body.orgId ?? null,
        userId,
        provider: provider.providerName,
        phone: registration.normalizedPhone,
        status: "ACTIVE",
        deviceLabel: body.deviceName,
        deviceFingerprint: body.deviceId,
        locale: body.locale,
        timezone: body.timezone,
        lastSeenAt: new Date(),
        lastRegisteredAt: new Date(),
      }),
    });
    return ok({ device });
  }
  if (request.method === "POST" && pathMatches(path, ["push", "whatsapp-unregister"])) {
    const body = whatsappUnregisterDeviceSchema.parse(await readJson(request));
    const userId = requireAuth(await getRequestContext(request));
    const normalizedPhone = normalizeWhatsAppPhone(body.phone);
    if (!normalizedPhone) {
      throw validationError("Enter a valid WhatsApp phone number.");
    }
    const device = await prisma.whatsAppDevice.findFirst({
      where: { userId, phone: normalizedPhone, revokedAt: null },
    });
    if (!device) {
      throw notFoundError("WhatsApp device not found");
    }
    const diagnostics = getWhatsAppProviderDiagnostics();
    if (
      diagnostics.status !== "misconfigured" &&
      diagnostics.status !== "unsupported" &&
      diagnostics.status !== "disabled"
    ) {
      await getWhatsAppProvider().unregisterDevice({ phone: device.phone });
    }
    const updated = await prisma.whatsAppDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        failureReason: null,
      },
    });
    return ok({ unregistered: true, device: updated });
  }
  return undefined;
}
