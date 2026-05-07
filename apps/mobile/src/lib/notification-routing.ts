export interface ParsedDeepLink {
  href: string;
  path: string;
  params: Record<string, string>;
}

type NotificationRouteInput = Record<string, unknown> | null | undefined;

const trustedWebHosts = new Set([
  "app.zookfit.in",
  "dashboard.zookfit.in",
  "zookfit.in",
  "www.zookfit.in",
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
    const parsed = new URL(directPath, "https://app.zookfit.in");
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

function notificationKind(input: NotificationRouteInput) {
  return [
    readString(input?.type),
    readString(input?.notificationType),
    readString(input?.subtype),
    readString(input?.eventType),
    readString(input?.kind),
    readString(input?.category),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase());
}

function hasNotificationKind(kinds: string[], values: string[]) {
  return kinds.some((kind) => values.includes(kind));
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
  const templateId = pickFirstString(input, ["templateId", "workoutTemplateId"]);
  const notificationKinds = notificationKind(input);
  const notificationType = notificationKinds[0];
  const targetType = readString(input?.targetType)?.toLowerCase();
  const targetId = readString(input?.targetId);
  const notificationId = readString(input?.notificationId);

  if (
    hasNotificationKind(notificationKinds, ["TRANSACTIONAL_MEMBERSHIP_RENEWED"]) ||
    (notificationType === "TRANSACTIONAL" && /\bmembership\b.*\brenew/.test(messageText(input)))
  ) {
    return "/membership";
  }

  if (
    attendanceRecordId &&
    (hasNotificationKind(notificationKinds, ["TRANSACTIONAL_ATTENDANCE_APPROVED"]) ||
      (notificationType === "TRANSACTIONAL" && /\battendance\b.*\bapproved\b/.test(messageText(input))))
  ) {
    return `/attendance/${encodePathSegment(attendanceRecordId)}`;
  }

  if (
    orderId &&
    (hasNotificationKind(notificationKinds, ["TRANSACTIONAL_ORDER_READY"]) ||
      (notificationType === "TRANSACTIONAL" && /\border\b.*\bready\b/.test(messageText(input))))
  ) {
    return `/shop/pickup/${encodePathSegment(orderId)}`;
  }

  if (
    notificationId &&
    (hasNotificationKind(notificationKinds, ["OPERATIONAL_GYM_CLOSURE", "PROMOTIONAL"]) ||
      notificationType === "PROMOTIONAL" ||
      (notificationType === "OPERATIONAL" && /\bclosure\b|\bclosed\b/.test(messageText(input))))
  ) {
    return `/notifications/${encodePathSegment(notificationId)}`;
  }

  if (
    assignmentId &&
    (hasNotificationKind(notificationKinds, ["PLAN_ASSIGNED"]) || notificationType === "PLAN")
  ) {
    return `/plans/${encodePathSegment(assignmentId)}`;
  }

  if (
    templateId &&
    (hasNotificationKind(notificationKinds, ["ENGAGEMENT_WORKOUT_REMINDER"]) ||
      (notificationType === "ENGAGEMENT" && /\bworkout\b.*\breminder\b/.test(messageText(input))))
  ) {
    return buildHref("/tracking-entry", { prefill: templateId });
  }

  if (targetType && targetId) {
    if (targetType === "plan") {
      return `/plans/${encodePathSegment(targetId)}`;
    }
    if (targetType === "order") {
      return `/shop/pickup/${encodePathSegment(targetId)}`;
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
    return `/shop/pickup/${encodePathSegment(orderId)}`;
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
    const detailParams = maybeAttachNotificationId(
      {
        ...params,
        ...(planId ? { planId } : {}),
        focus: hasPtContext(input) ? "pt-update" : "plan",
      },
      input,
    );
    return buildHref(`/plans/${encodePathSegment(assignmentId)}`, detailParams);
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

  if (notificationId) {
    return buildHref(`/notifications/${encodePathSegment(notificationId)}`, params);
  }

  return buildHref("/notifications", params);
}
