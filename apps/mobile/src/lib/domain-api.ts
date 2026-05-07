import type { AuthSessionSummary, Role } from "@zook/core";
import { mobileApiFetch } from "./api";

type RequestOptions = {
  token?: string;
  orgId?: string;
  branchId?: string;
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

type SsoCallbackResult = VerifyOtpResult;

export type MobileUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type FileAsset = {
  id: string;
  url?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  category?: string | null;
};

export type FileUploadResponse = {
  file?: FileAsset | null;
  deliveryUrl?: string | null;
  signedUrl?: string | null;
};

export type ProfilePhotoSaveResponse = {
  user?: {
    profilePhotoUrl?: string | null;
  } | null;
  profile?: {
    profilePhotoUrl?: string | null;
  } | null;
  file?: FileAsset | null;
};

export const apiClient = {
  request: mobileApiFetch,
};

export const filesApi = {
  uploadProfilePhoto(options: RequestOptions & { file: MobileUploadFile; visibility?: "private" | "org" }) {
    const formData = new FormData();
    formData.append("category", "profile_photo");
    formData.append("visibility", options.visibility ?? "private");
    if (options.orgId) {
      formData.append("orgId", options.orgId);
    }
    formData.append("file", options.file as unknown as Blob);

    return mobileApiFetch<FileUploadResponse>("/files/upload", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: formData,
    });
  },
};

export const authClient = {
  requestOtp(identifier: string) {
    return mobileApiFetch<OtpResult>("/auth/request-otp", {
      method: "POST",
      body: { identifier },
    });
  },
  verifyOtp(identifier: string, code: string) {
    return mobileApiFetch<VerifyOtpResult>("/auth/verify-otp", {
      method: "POST",
      body: { identifier, code },
    });
  },
  signInWithApple(identityToken: string) {
    return mobileApiFetch<SsoCallbackResult>("/auth/apple/callback", {
      method: "POST",
      body: { identityToken },
    });
  },
  signInWithGoogle(idToken: string) {
    return mobileApiFetch<SsoCallbackResult>("/auth/google/callback", {
      method: "POST",
      body: { idToken },
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
  saveProfilePhotoAsset<T = ProfilePhotoSaveResponse>(
    options: RequestOptions & { fileAssetId: string; consentToAttendanceUse?: boolean },
  ) {
    return mobileApiFetch<T>("/me/profile-photo", {
      method: "PATCH",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: {
        fileAssetId: options.fileAssetId,
        ...(options.orgId ? { orgId: options.orgId } : {}),
        ...(options.consentToAttendanceUse !== undefined
          ? { consentToAttendanceUse: options.consentToAttendanceUse }
          : {}),
      },
    });
  },
  removeProfilePhoto<T = ProfilePhotoSaveResponse>(options: RequestOptions) {
    return mobileApiFetch<T>("/me/profile", {
      method: "PATCH",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: {
        ...(options.orgId ? { orgId: options.orgId } : {}),
        profilePhotoAssetId: null,
        profilePhotoUrl: null,
      },
    });
  },
  requestContactOtp<T = { challengeId: string; expiresAt: string; devOtp?: string }>(
    options: RequestOptions & { identifier: string },
  ) {
    return mobileApiFetch<T>("/me/contact/request-otp", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: { identifier: options.identifier },
    });
  },
  verifyContactOtp<T = { user?: unknown; session?: AuthSessionSummary }>(
    options: RequestOptions & { identifier: string; code: string },
  ) {
    return mobileApiFetch<T>("/me/contact/verify-otp", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: { identifier: options.identifier, code: options.code },
    });
  },
  renewMembership<T = { checkoutUrl?: string; subscription?: unknown }>(
    options: RequestOptions & { subscriptionId: string; planId?: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/renew`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        ...(options.planId ? { planId: options.planId } : {}),
        ...(options.branchId ? { branchId: options.branchId } : {}),
      },
    });
  },
  enableAutopay<T = { checkoutUrl?: string | null; mandate?: unknown; session?: unknown }>(
    options: RequestOptions & { subscriptionId: string; planId?: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/autopay`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        ...(options.planId ? { planId: options.planId } : {}),
        ...(options.branchId ? { branchId: options.branchId } : {}),
      },
    });
  },
  cancelAutopay<T = { mandate?: unknown }>(options: RequestOptions & { subscriptionId: string }) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/autopay`, {
      method: "DELETE",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
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
  detail<T = unknown>(options: RequestOptions & { attendanceRecordId: string }) {
    return mobileApiFetch<T>(`/me/attendance/${options.attendanceRecordId}`, {
      token: options.token,
    });
  },
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
  review<T = unknown>(options: RequestOptions & { planId: string }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/plans/${options.planId}/review`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
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
  sendFeedback<T = { ok: boolean }>(
    options: RequestOptions & { assignmentId: string; message: string },
  ) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/plan-feedback`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: {
        planAssignmentId: options.assignmentId,
        message: options.message,
      },
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
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        orgId: options.orgId,
        items: options.items,
        ...(options.branchId ? { branchId: options.branchId } : {}),
      },
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
    options: RequestOptions & {
      orgId: string;
      planId?: string;
      referralCode?: string;
      branchId?: string;
    },
  ) {
    return mobileApiFetch(`/orgs/${options.orgId}/join-requests`, {
      method: "POST",
      token: options.token,
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        ...(options.planId ? { planId: options.planId } : {}),
        ...(options.referralCode ? { referralCode: options.referralCode } : {}),
        ...(options.branchId ? { branchId: options.branchId } : {}),
      },
    });
  },
  createSubscriptionCheckout(
    options: RequestOptions & {
      orgId: string;
      planId: string;
      referralCode?: string;
      branchId?: string;
    },
  ) {
    return mobileApiFetch<{ checkoutUrl: string }>(`/orgs/${options.orgId}/subscriptions`, {
      method: "POST",
      token: options.token,
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        planId: options.planId,
        ...(options.referralCode ? { referralCode: options.referralCode } : {}),
        ...(options.branchId ? { branchId: options.branchId } : {}),
      },
    });
  },
};

export const paymentsApi = {
  completeMockPayment(options: RequestOptions & { sessionId: string }) {
    return mobileApiFetch(`/payments/mock/${options.sessionId}/complete`, {
      method: "POST",
      token: options.token,
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: { status: "SUCCEEDED", ...(options.branchId ? { branchId: options.branchId } : {}) },
    });
  },
  recordManualPayment(options: RequestOptions & { body: Record<string, unknown> }) {
    return mobileApiFetch(`/orgs/${options.orgId}/manual-payments`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: { ...options.body, ...(options.branchId ? { branchId: options.branchId } : {}) },
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
    options: RequestOptions & {
      prompt: string;
      targetUserId: string;
      title?: string;
      type?: string;
    },
  ) {
    return mobileApiFetch<T>("/ai/generate-plan", {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: {
        orgId: options.orgId,
        targetUserId: options.targetUserId,
        prompt: options.prompt,
        title: options.title,
        type: options.type,
        persistDraft: true,
      },
    });
  },
  updateClientNote<T = { note: string }>(
    options: RequestOptions & { trainerUserId: string; clientId: string; note: string },
  ) {
    return mobileApiFetch<T>(
      `/orgs/${options.orgId}/trainers/${options.trainerUserId}/clients/${options.clientId}/note`,
      {
        method: "PATCH",
        token: options.token,
        orgId: options.orgId,
        body: { note: options.note },
      },
    );
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
  member<T = unknown>(options: RequestOptions & { memberUserId: string }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/members/${options.memberUserId}`, {
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
  markAllRead(options: RequestOptions & { ids: string[] }) {
    return mobileApiFetch("/me/notifications/read", {
      method: "POST",
      token: options.token,
      body: { ids: options.ids },
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
