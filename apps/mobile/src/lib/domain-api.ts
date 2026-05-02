import type { AuthSessionSummary, Role } from "@zook/core";
import { mobileApiFetch } from "./api";

type RequestOptions = {
  token?: string;
  orgId?: string;
};

type OtpResult = {
  challengeId: string;
  expiresAt: string;
  devOtp?: string;
};

type VerifyOtpResult = {
  token: string;
  expiresAt: string;
  session?: AuthSessionSummary;
};

export const apiClient = {
  request: mobileApiFetch,
};

export const authClient = {
  requestOtp(email: string) {
    return mobileApiFetch<OtpResult>("/auth/request-otp", {
      method: "POST",
      body: { email },
    });
  },
  verifyOtp(email: string, code: string) {
    return mobileApiFetch<VerifyOtpResult>("/auth/verify-otp", {
      method: "POST",
      body: { email, code },
    });
  },
  me(options: RequestOptions = {}) {
    return mobileApiFetch<AuthSessionSummary>("/auth/me", {
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
  logout(token?: string) {
    return mobileApiFetch("/auth/logout", {
      method: "POST",
      ...(token ? { token } : {}),
    });
  },
};

export const memberApi = {
  home(options: RequestOptions) {
    return mobileApiFetch("/me/home", options);
  },
  profile(options: RequestOptions) {
    return mobileApiFetch("/me/profile", options);
  },
  updateProfile(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch("/me/profile", {
      method: "PATCH",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
    });
  },
  createTrackingWorkout(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch("/me/tracking/workouts", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
    });
  },
};

export const attendanceApi = {
  scan<T = unknown>(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch<T>("/attendance/scan", {
      method: "POST",
      token: options.token,
      body: options.body,
    });
  },
  devScan<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>("/attendance/dev-scan", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
  approve(options: RequestOptions & { recordId: string }) {
    return mobileApiFetch(`/orgs/${options.orgId}/attendance/${options.recordId}/approve`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
    });
  },
  reject(options: RequestOptions & { recordId: string; reason: string }) {
    return mobileApiFetch(`/orgs/${options.orgId}/attendance/${options.recordId}/reject`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: { reason: options.reason },
    });
  },
};

export const plansApi = {
  create<T = unknown>(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/plans`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: options.body,
    });
  },
  update<T = unknown>(options: RequestOptions & { planId: string; body: Record<string, unknown> }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/plans/${options.planId}`, {
      method: "PATCH",
      token: options.token,
      orgId: options.orgId,
      body: options.body,
    });
  },
  assign(
    options: RequestOptions & { planId: string; assignedToUserId?: string; audience?: string },
  ) {
    return mobileApiFetch(`/orgs/${options.orgId}/plans/${options.planId}/assign`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: {
        assignedToUserId: options.assignedToUserId,
        audience: options.audience ?? "selected_member",
      },
    });
  },
  completeAssignment(
    options: RequestOptions & { assignmentId: string; body: Record<string, unknown> },
  ) {
    return mobileApiFetch(`/me/plans/${options.assignmentId}/complete`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
    });
  },
};

export const shopApi = {
  createOrder(
    options: RequestOptions & {
      orgId: string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    return mobileApiFetch("/shop/orders", {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: { orgId: options.orgId, items: options.items },
    });
  },
  fulfillOrder(options: RequestOptions & { orderId: string }) {
    return mobileApiFetch(`/orgs/${options.orgId}/shop/orders/${options.orderId}/fulfill`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
    });
  },
};

export const gymApi = {
  requestMembership(
    options: RequestOptions & { orgId: string; planId?: string; referralCode?: string },
  ) {
    return mobileApiFetch(`/orgs/${options.orgId}/join-requests`, {
      method: "POST",
      token: options.token,
      body: {
        ...(options.planId ? { planId: options.planId } : {}),
        ...(options.referralCode ? { referralCode: options.referralCode } : {}),
      },
    });
  },
  createSubscriptionCheckout(
    options: RequestOptions & { orgId: string; planId: string; referralCode?: string },
  ) {
    return mobileApiFetch<{ checkoutUrl: string }>(`/orgs/${options.orgId}/subscriptions`, {
      method: "POST",
      token: options.token,
      body: {
        planId: options.planId,
        ...(options.referralCode ? { referralCode: options.referralCode } : {}),
      },
    });
  },
};

export const paymentsApi = {
  completeMockPayment(options: RequestOptions & { sessionId: string }) {
    return mobileApiFetch(`/payments/mock/${options.sessionId}/complete`, {
      method: "POST",
      token: options.token,
      body: { status: "SUCCEEDED" },
    });
  },
  recordManualPayment(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch(`/orgs/${options.orgId}/manual-payments`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: options.body,
    });
  },
};

export const trainerApi = {
  clients(options: RequestOptions & { trainerUserId: string }) {
    return mobileApiFetch(`/orgs/${options.orgId}/trainers/${options.trainerUserId}/clients`, {
      token: options.token,
      orgId: options.orgId,
    });
  },
  generatePlanDraft<T = unknown>(
    options: RequestOptions & { prompt: string; title?: string; type?: string },
  ) {
    return mobileApiFetch<T>("/ai/generate-plan", {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: {
        orgId: options.orgId,
        prompt: options.prompt,
        title: options.title,
        type: options.type,
        persistDraft: true,
      },
    });
  },
};

export const receptionApi = {
  verifyCode<T = unknown>(options: RequestOptions & { code: string }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/reception/verify-code`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: { code: options.code },
    });
  },
  manualAttendance(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch(`/orgs/${options.orgId}/attendance/manual`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: options.body,
    });
  },
};

export const ownerApi = {
  dashboard<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/dashboard`, {
      token: options.token,
      orgId: options.orgId,
    });
  },
  members<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/members`, {
      token: options.token,
      orgId: options.orgId,
    });
  },
  updateJoinRequest(
    options: RequestOptions & { joinRequestId: string; action: "approve" | "reject" },
  ) {
    return mobileApiFetch(
      `/orgs/${options.orgId}/join-requests/${options.joinRequestId}/${options.action}`,
      {
        method: "POST",
        token: options.token,
        orgId: options.orgId,
      },
    );
  },
};

export const notificationsApi = {
  markRead(options: RequestOptions & { id: string }) {
    return mobileApiFetch(`/me/notifications/${options.id}/read`, {
      method: "POST",
      token: options.token,
    });
  },
  updatePreferences(options: RequestOptions & { preferences: Record<string, unknown> }) {
    return mobileApiFetch("/me/notification-preferences", {
      method: "PATCH",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.preferences,
    });
  },
};

export const pushApi = {
  registerDevice(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch("/push/register-device", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
    });
  },
  unregisterDevice(options: RequestOptions & { tokenValue: string }) {
    return mobileApiFetch("/push/unregister-device", {
      method: "POST",
      token: options.token,
      body: { token: options.tokenValue },
    });
  },
};

export const privacyApi = {
  requestDataExport(options: RequestOptions) {
    return mobileApiFetch("/me/data-export-request", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
  requestAccountDeletion(options: RequestOptions) {
    return mobileApiFetch("/me/account-deletion-request", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
};

export const aiApi = {
  chat<T = unknown>(options: RequestOptions & { prompt: string; role: Role }) {
    return mobileApiFetch<T>("/ai/chat", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: {
        orgId: options.orgId,
        prompt: options.prompt,
        role: options.role,
        requestType: "CHAT",
      },
    });
  },
};
