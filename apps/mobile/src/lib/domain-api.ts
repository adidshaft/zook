import { isSeededDemoIdentifier, type AuthSessionSummary, type Role } from "@zook/core";
import { mobileApiFetch } from "./api";
import { getMobileAppEnv } from "./runtime-mode";

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

export type VerifyOtpResult = {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  refreshExpiresAt?: string;
  session?: AuthSessionSummary;
};

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

function localSimulatorAuthHeaders(identifier: string) {
  if (getMobileAppEnv() !== "local" || !isSeededDemoIdentifier(identifier)) {
    return undefined;
  }
  return { "x-zook-qa-auth": "simulator" };
}

export const filesApi = {
  uploadProfilePhoto(
    options: RequestOptions & { file: MobileUploadFile; visibility?: "private" | "org" },
  ) {
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
  uploadBodyProgressPhoto(options: RequestOptions & { file: MobileUploadFile }) {
    const formData = new FormData();
    formData.append("category", "body_progress_photo");
    formData.append("visibility", "private");
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

export const trackingApi = {
  recordBodyProgress(
    options: RequestOptions & {
      body: {
        measuredAt: string;
        weightKg?: number;
        waistCm?: number;
        hipCm?: number;
        chestCm?: number;
        shoulderCm?: number;
        armCm?: number;
        forearmCm?: number;
        thighCm?: number;
        calfCm?: number;
        neckCm?: number;
        bodyFatPercent?: number;
        muscleMassKg?: number;
        visceralFatRating?: number;
        restingHeartRate?: number;
        photoAssetId?: string;
        organizationId?: string;
        notes?: string;
        visibility?: "PRIVATE" | "TRAINER_VISIBLE";
      };
    },
  ) {
    return mobileApiFetch<{ entry: { id: string } }>("/me/tracking/body-progress", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
    });
  },
};

export const authClient = {
  requestOtp(identifier: string) {
    return mobileApiFetch<OtpResult>("/auth/request-otp", {
      method: "POST",
      ...(localSimulatorAuthHeaders(identifier)
        ? { headers: localSimulatorAuthHeaders(identifier) }
        : {}),
      body: { identifier },
    });
  },
  verifyOtp(identifier: string, code: string) {
    return mobileApiFetch<VerifyOtpResult>("/auth/verify-otp", {
      method: "POST",
      ...(localSimulatorAuthHeaders(identifier)
        ? { headers: localSimulatorAuthHeaders(identifier) }
        : {}),
      body: { identifier, code },
    });
  },
  googleCallback(idToken: string) {
    return mobileApiFetch<VerifyOtpResult>("/auth/google/callback", {
      method: "POST",
      body: { idToken },
    });
  },
  appleCallback(input: { identityToken: string; fullName?: string }) {
    return mobileApiFetch<VerifyOtpResult>("/auth/apple/callback", {
      method: "POST",
      body: { identityToken: input.identityToken, ...(input.fullName ? { fullName: input.fullName } : {}) },
    });
  },
  me(options: RequestOptions = {}) {
    return mobileApiFetch<AuthSessionSummary>("/auth/me", {
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      skipAuthRefresh: true,
    });
  },
  refresh(refreshToken: string) {
    return mobileApiFetch<VerifyOtpResult>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuthRefresh: true,
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
  getEngagement<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>("/me/engagement", {
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
  getBadges<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>("/me/badges", {
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
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
  cancelMembership<T = { subscription?: unknown }>(
    options: RequestOptions & { subscriptionId: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/cancel`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
    });
  },
  switchMembership<T = { subscription?: unknown; proration?: unknown }>(
    options: RequestOptions & { subscriptionId: string; planId: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/switch`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: { planId: options.planId },
    });
  },
  pauseMembership<T = { subscription?: unknown; pauseDaysRequested?: number }>(
    options: RequestOptions & { subscriptionId: string; resumesAt: string; reason?: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/pause`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
      body: {
        resumesAt: options.resumesAt,
        ...(options.reason ? { reason: options.reason } : {}),
      },
    });
  },
  resumeMembership<T = { subscription?: unknown }>(
    options: RequestOptions & { subscriptionId: string },
  ) {
    return mobileApiFetch<T>(`/me/memberships/${options.subscriptionId}/resume`, {
      method: "POST",
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
  checkout<T = unknown>(
    options: RequestOptions & {
      attendanceRecordId: string;
      body?: { reason?: "manual" | "geofence"; latitude?: number; longitude?: number };
    },
  ) {
    return mobileApiFetch<T>(`/me/attendance/${options.attendanceRecordId}/checkout`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body ?? { reason: "manual" },
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
  delete<T = unknown>(options: RequestOptions & { planId: string }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/plans/${options.planId}`, {
      method: "DELETE",
      token: options.token,
      orgId: options.orgId,
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
    return mobileApiFetch<{ checkoutUrl: string; session?: { id?: string; status?: string } }>(
      `/orgs/${options.orgId}/subscriptions`,
      {
        method: "POST",
        token: options.token,
        ...(options.branchId ? { branchId: options.branchId } : {}),
        body: {
          planId: options.planId,
          ...(options.referralCode ? { referralCode: options.referralCode } : {}),
          ...(options.branchId ? { branchId: options.branchId } : {}),
        },
      },
    );
  },
};

export const paymentsApi = {
  refreshPaymentSession<T = { session: { id: string; status: string }; payment?: unknown | null }>(
    options: RequestOptions & { sessionId: string },
  ) {
    return mobileApiFetch<T>(`/payments/session/${options.sessionId}/refresh`, {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      ...(options.branchId ? { branchId: options.branchId } : {}),
    });
  },
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
  recordClientBodyProgress<T = { entry: { id: string } }>(
    options: RequestOptions & {
      trainerUserId: string;
      clientId: string;
      body: Record<string, unknown>;
    },
  ) {
    return mobileApiFetch<T>(
      `/orgs/${options.orgId}/trainers/${options.trainerUserId}/clients/${options.clientId}/body-progress`,
      {
        method: "POST",
        token: options.token,
        orgId: options.orgId,
        body: options.body,
      },
    );
  },
  createClientDietPlan<T = { plan: { id: string } }>(
    options: RequestOptions & {
      trainerUserId: string;
      clientId: string;
      body: Record<string, unknown>;
    },
  ) {
    return mobileApiFetch<T>(
      `/orgs/${options.orgId}/trainers/${options.trainerUserId}/clients/${options.clientId}/diet-plans`,
      {
        method: "POST",
        token: options.token,
        orgId: options.orgId,
        body: options.body,
      },
    );
  },
  payouts<T = unknown>(options: RequestOptions & { trainerUserId: string; month?: string }) {
    const query = options.month ? `?month=${encodeURIComponent(options.month)}` : "";
    return mobileApiFetch<T>(
      `/orgs/${options.orgId}/trainers/${options.trainerUserId}/payouts${query}`,
      {
        token: options.token,
        orgId: options.orgId,
      },
    );
  },
};

export const dietApi = {
  getMine<T = unknown>(options: RequestOptions & { date?: string }) {
    const query = options.date ? `?date=${encodeURIComponent(options.date)}` : "";
    return mobileApiFetch<T>(`/me/diet${query}`, {
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
    });
  },
  logMeal<T = { log: { id: string } }>(
    options: RequestOptions & { body: Record<string, unknown> },
  ) {
    return mobileApiFetch<T>("/me/diet/meal-logs", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: options.body,
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
  reportsSummary<T = unknown>(options: RequestOptions) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/reports/summary`, {
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
  approveJoinRequestsBatch<T = unknown>(options: RequestOptions & { joinRequestIds: string[] }) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/join-requests/approve-batch`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: { joinRequestIds: options.joinRequestIds },
    });
  },
  sendMemberNotification<T = unknown>(
    options: RequestOptions & {
      memberUserId: string;
      title: string;
      body: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return mobileApiFetch<T>(`/orgs/${options.orgId}/notifications`, {
      method: "POST",
      token: options.token,
      orgId: options.orgId,
      body: {
        type: "OPERATIONAL",
        audience: "single_member",
        title: options.title,
        body: options.body,
        pushEnabled: true,
        selectedUserIds: [],
        singleUserId: options.memberUserId,
        metadata: options.metadata ?? {},
      },
    });
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

export const supportApi = {
  submitFeedback(
    options: RequestOptions & {
      message: string;
      appVersion: string;
      role: Role;
    },
  ) {
    return mobileApiFetch<{ submitted: boolean }>("/support/feedback", {
      method: "POST",
      token: options.token,
      ...(options.orgId ? { orgId: options.orgId } : {}),
      body: {
        message: options.message,
        appVersion: options.appVersion,
        role: options.role,
        ...(options.orgId ? { orgId: options.orgId } : {}),
      },
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
