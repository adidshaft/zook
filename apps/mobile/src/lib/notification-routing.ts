export interface ParsedDeepLink {
  href: string;
  path: string;
  params: Record<string, string>;
}

type NotificationRouteInput = Record<string, unknown> | null | undefined;

const trustedWebHosts = new Set([
  "zook.app",
  "www.zook.app",
  "staging.zook.app",
  "localhost",
  "127.0.0.1",
]);

function readString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePath(path: string) {
  const cleaned = path.trim();
  if (!cleaned) {
    return "/";
  }
  return cleaned.startsWith("/")
    ? cleaned.replace(/\/+$/, "") || "/"
    : `/${cleaned.replace(/\/+$/, "")}`;
}

function searchParamsToRecord(searchParams: URLSearchParams) {
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

function buildHref(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function parseInternalUrl(url: string): ParsedDeepLink | null {
  const directPath = readString(url);
  if (!directPath) {
    return null;
  }
  if (directPath.startsWith("/")) {
    const parsed = new URL(directPath, "https://zook.app");
    const path = normalizePath(parsed.pathname);
    const params = searchParamsToRecord(parsed.searchParams);
    return { path, params, href: buildHref(path, params) };
  }
  return parseDeepLinkUrl(directPath);
}

function maybeAttachNotificationId(params: Record<string, string>, input: NotificationRouteInput) {
  const notificationId = readString(input?.notificationId);
  if (notificationId && !params.notificationId) {
    params.notificationId = notificationId;
  }
  return params;
}

function pickFirstString(input: NotificationRouteInput, keys: string[]) {
  for (const key of keys) {
    const value = readString(input?.[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function messageText(input: NotificationRouteInput) {
  return [readString(input?.title), readString(input?.body), readString(input?.message)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasPtContext(input: NotificationRouteInput) {
  return Boolean(
    pickFirstString(input, ["ptSessionId", "ptSubscriptionId", "ptPlanId", "ptPackageId"]) ??
    /\bpt\b|personal training/.test(messageText(input)),
  );
}

export function parseDeepLinkUrl(url: string): ParsedDeepLink | null {
  const value = readString(url);
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol === "zook:") {
      const segments = [
        ...parsed.hostname.split("/").filter(Boolean),
        ...parsed.pathname.split("/").filter(Boolean),
      ].map((segment) => decodeURIComponent(segment));
      const path = normalizePath(segments.join("/"));
      const params = searchParamsToRecord(parsed.searchParams);
      return { path, params, href: buildHref(path, params) };
    }

    if (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      trustedWebHosts.has(parsed.hostname)
    ) {
      const path = normalizePath(parsed.pathname);
      const params = searchParamsToRecord(parsed.searchParams);
      return { path, params, href: buildHref(path, params) };
    }
  } catch {
    return null;
  }

  return null;
}

export function mapNotificationPayloadToHref(input: NotificationRouteInput) {
  const explicitRoute = pickFirstString(input, ["deepLink", "url", "href", "route"]);
  const parsedExplicitRoute = explicitRoute ? parseInternalUrl(explicitRoute) : null;
  if (parsedExplicitRoute) {
    return parsedExplicitRoute.href;
  }

  const params: Record<string, string> = {};
  const orgId = pickFirstString(input, ["orgId"]);
  if (orgId) {
    params.orgId = orgId;
  }

  const assignmentId = pickFirstString(input, ["assignmentId", "planAssignmentId"]);
  const planId = pickFirstString(input, ["planId"]);
  const orderId = pickFirstString(input, ["orderId", "shopOrderId"]);
  const subscriptionId = pickFirstString(input, ["subscriptionId", "membershipId"]);
  const joinRequestId = pickFirstString(input, ["joinRequestId"]);
  const attendanceRecordId = pickFirstString(input, ["attendanceRecordId"]);
  const notificationType = readString(input?.type)?.toUpperCase();
  const targetType = readString(input?.targetType)?.toLowerCase();
  const targetId = readString(input?.targetId);

  if (targetType && targetId) {
    if (targetType === "plan") {
      return buildHref(
        "/plans",
        maybeAttachNotificationId({ ...params, assignmentId: targetId, focus: "plan" }, input),
      );
    }
    if (targetType === "order") {
      return buildHref(
        "/shop",
        maybeAttachNotificationId({ ...params, orderId: targetId, focus: "pickup" }, input),
      );
    }
    if (targetType === "membership") {
      return buildHref(
        "/membership",
        maybeAttachNotificationId({ ...params, subscriptionId: targetId, focus: "membership" }, input),
      );
    }
    if (targetType === "attendance") {
      return buildHref(
        `/attendance/${encodePathSegment(targetId)}`,
        maybeAttachNotificationId({ ...params, focus: "attendance" }, input),
      );
    }
  }

  if (orderId) {
    return buildHref(
      "/shop",
      maybeAttachNotificationId({ ...params, orderId, focus: "shop-order" }, input),
    );
  }

  if (subscriptionId || joinRequestId || messageText(input).includes("membership")) {
    return buildHref(
      "/membership",
      maybeAttachNotificationId(
        {
          ...params,
          ...(subscriptionId ? { subscriptionId } : {}),
          ...(joinRequestId ? { joinRequestId } : {}),
          focus: joinRequestId ? "join-request" : "membership",
        },
        input,
      ),
    );
  }

  if (assignmentId) {
    return buildHref(
      "/plans",
      maybeAttachNotificationId(
        {
          ...params,
          assignmentId,
          ...(planId ? { planId } : {}),
          focus: hasPtContext(input) ? "pt-update" : "plan",
        },
        input,
      ),
    );
  }

  if (planId || notificationType === "PLAN") {
    return buildHref(
      "/plans",
      maybeAttachNotificationId(
        {
          ...params,
          ...(planId ? { planId } : {}),
          focus: hasPtContext(input) ? "pt-update" : "plan",
        },
        input,
      ),
    );
  }

  if (attendanceRecordId) {
    return buildHref(
      `/attendance/${encodePathSegment(attendanceRecordId)}`,
      maybeAttachNotificationId({ ...params, focus: "attendance" }, input),
    );
  }

  if (/\battendance\b|check-?in/.test(messageText(input))) {
    return buildHref("/", maybeAttachNotificationId({ ...params, focus: "attendance" }, input));
  }

  if (hasPtContext(input)) {
    return buildHref("/plans", maybeAttachNotificationId({ ...params, focus: "pt-update" }, input));
  }

  const notificationId = readString(input?.notificationId);
  if (notificationId) {
    return buildHref(`/notifications/${encodePathSegment(notificationId)}`, params);
  }

  return buildHref("/notifications", params);
}
