import { zookDemoFixtures } from "@zook/core/demo-fixtures";

import { getOfflineDemoSession } from "../../demo-mode";

let demoNotificationPreferences = {
  transactional: true,
  operational: true,
  engagement: true,
  promotional: true,
  pushEnabled: false,
};

function nowIso() {
  return new Date().toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function demoProfile() {
  const session = getOfflineDemoSession();
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === session.user.id);
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      phone: session.user.phone,
      dateOfBirth:
        zookDemoFixtures.users.find((user) => user.id === session.user.id)?.dateOfBirth ?? null,
      fitnessGoal: profile?.goal ?? null,
    },
    profile: profile
      ? {
          id: profile.id,
          notes: profile.goal,
          profilePhotoUrl: null,
          publicVisibility: true,
        }
      : null,
    wellness: {
      weightKg: 78,
      dietPreference: profile?.dietPreference ?? "Vegetarian",
      allergies: profile?.allergyNote ?? "None added",
      summaryNote: "Local test profile saved on this device.",
      latestMeasurementAt: nowIso(),
    },
  };
}

export function accountDemoResponse(
  pathname: string,
  method: string,
  init: { body?: unknown },
) {
  if (pathname === "/me/contact/request-otp" && method === "POST") {
    return {
      challengeId: "offline-demo-otp",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      devOtp: "000000",
    };
  }

  if (pathname === "/me/contact/verify-otp" && method === "POST") {
    return { ok: true };
  }

  if (pathname === "/me/orgs") {
    const session = getOfflineDemoSession();
    return { organizations: session.organizations, activeOrgId: session.activeOrgId };
  }

  if (pathname === "/me/profile") return demoProfile();

  if (pathname === "/me/profile-photo" && method === "PATCH") {
    return { user: { profilePhotoUrl: null } };
  }

  if (pathname === "/me/notification-preferences") {
    if (method === "PATCH") {
      const body = demoBody(init);
      const patch =
        Array.isArray(body.preferences) && typeof body.preferences[0] === "object"
          ? (body.preferences[0] as Record<string, unknown>)
          : body;
      demoNotificationPreferences = {
        ...demoNotificationPreferences,
        ...patch,
      };
    }
    return { preferences: [demoNotificationPreferences] };
  }

  if (pathname === "/me/push-devices") return { devices: [] };

  return undefined;
}
