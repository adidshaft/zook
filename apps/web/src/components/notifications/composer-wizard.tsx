"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Permission, Role } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import { ConfirmDialog } from "../dashboard-primitives";
import { Send } from "lucide-react";
import { GlassCard } from "../glass-card";
import { PulseDot, SectionHero } from "../dashboard/charts";
import { ZookButton } from "../zook-button";
import {
  AudienceStep,
  ComposerDeliveryHistory,
  MessageDraftStep,
  MessageTypeStep,
  ReviewStep,
} from "./composer-steps";
import {
  audienceOptions,
  canUseNotificationOption,
  messageTypes,
  permissionAudience,
  type Audience,
  type BranchRow,
  type MemberRow,
  type NotificationRow,
  type NotificationType,
  type PlanRow,
  type Preview,
  type TemplateRow,
} from "./shared";

function isAudience(value: string | null): value is Audience {
  return Boolean(
    value &&
    [
      "all_active_members",
      "expiring_soon",
      "branch_members",
      "membership_plan",
      "single_member",
      "selected_members",
      "assigned_clients",
    ].includes(value),
  );
}

export function NotificationComposerPanel({
  orgId,
  roles = [],
  permissions = [],
}: {
  orgId: string;
  roles?: Role[];
  permissions?: Permission[];
}) {
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("OPERATIONAL");
  const [audience, setAudience] = useState<Audience>("all_active_members");
  const [branchId, setBranchId] = useState("");
  const [planId, setPlanId] = useState("");
  const [singleUserId, setSingleUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [daysAhead, setDaysAhead] = useState("7");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [queryApplied, setQueryApplied] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      const [notificationPayload, templatePayload, memberPayload, branchPayload, planPayload] =
        await Promise.all([
          webApiFetch<{ notifications: NotificationRow[] }>(`/api/orgs/${orgId}/notifications`),
          webApiFetch<{ templates: TemplateRow[] }>(`/api/orgs/${orgId}/notifications/templates`),
          webApiFetch<{ members: MemberRow[] }>(`/api/orgs/${orgId}/members?limit=100`),
          webApiFetch<{ branches: BranchRow[] }>(`/api/orgs/${orgId}/branches`),
          webApiFetch<{ plans: PlanRow[] }>(`/api/orgs/${orgId}/membership-plans`),
        ]);
      setNotifications(notificationPayload.notifications);
      setTemplates(templatePayload.templates);
      setMembers(memberPayload.members);
      setBranches(branchPayload.branches);
      setPlans(planPayload.plans.filter((plan) => plan.active !== false));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load message tools.");
    }
  }, [orgId]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const typePermissions = useMemo(
    () =>
      new Map(
        messageTypes.map((option) => [
          option.value,
          audienceOptions(option.value).some((candidate) =>
            canUseNotificationOption({
              roles,
              permissions,
              type: option.value,
              audience: permissionAudience(candidate.value),
            }),
          ),
        ]),
      ),
    [permissions, roles],
  );
  const availableAudiences = useMemo(
    () =>
      audienceOptions(type).map((option) => ({
        ...option,
        allowed: canUseNotificationOption({
          roles,
          permissions,
          type,
          audience: permissionAudience(option.value),
        }),
      })),
    [permissions, roles, type],
  );
  const canManageTemplates = permissions.includes("NOTIFICATION_MANAGE_TEMPLATES");
  const notificationPayload = useMemo(
    () => ({
      title,
      body,
      type,
      audience,
      pushEnabled,
      branchId: branchId || undefined,
      planId: planId || undefined,
      singleUserId: singleUserId || undefined,
      selectedUserIds,
      daysAhead: Number(daysAhead) || 7,
      scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
    }),
    [
      audience,
      body,
      branchId,
      daysAhead,
      planId,
      pushEnabled,
      scheduleAt,
      selectedUserIds,
      singleUserId,
      title,
      type,
    ],
  );

  useEffect(() => {
    const firstAllowed = availableAudiences.find((option) => option.allowed);
    if (!availableAudiences.some((option) => option.value === audience && option.allowed)) {
      setAudience(firstAllowed?.value ?? "all_active_members");
      setPreview(null);
    }
  }, [audience, availableAudiences]);

  useEffect(() => {
    if (queryApplied) return;
    const nextAudience = searchParams.get("audience");
    const nextUserId = searchParams.get("userId");
    const nextBranchId = searchParams.get("branchId");
    const nextPlanId = searchParams.get("planId");
    if (!isAudience(nextAudience) && !nextUserId && !nextBranchId && !nextPlanId) {
      setQueryApplied(true);
      return;
    }
    if (isAudience(nextAudience)) {
      const allowed = availableAudiences.some(
        (option) => option.value === nextAudience && option.allowed,
      );
      if (allowed) {
        setAudience(nextAudience);
      }
    }
    if (nextUserId) {
      setAudience("single_member");
      setSingleUserId(nextUserId);
    }
    if (nextBranchId) {
      setAudience("branch_members");
      setBranchId(nextBranchId);
    }
    if (nextPlanId) {
      setAudience("membership_plan");
      setPlanId(nextPlanId);
    }
    setStep(2);
    setPreview(null);
    setQueryApplied(true);
  }, [availableAudiences, queryApplied, searchParams]);

  function payload() {
    return notificationPayload;
  }

  function applyTemplate(template: TemplateRow) {
    setTitle(template.title);
    setBody(template.body);
    setType(template.type);
    setPreview(null);
    setStep(3);
  }

  function validateDraft() {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and message before sending.");
      return false;
    }
    if (audience === "branch_members" && !branchId) {
      setError("Choose a branch.");
      return false;
    }
    if (audience === "membership_plan" && !planId) {
      setError("Choose a plan.");
      return false;
    }
    if (audience === "single_member" && !singleUserId) {
      setError("Choose one member.");
      return false;
    }
    if (audience === "selected_members" && selectedUserIds.length === 0) {
      setError("Choose at least one member.");
      return false;
    }
    setError("");
    return true;
  }

  function validateCurrentStep(targetStep: number) {
    if (targetStep === 1) {
      if (!typePermissions.get(type)) {
        setError("Choose a notification type your role can send.");
        return false;
      }
      setError("");
      return true;
    }
    if (targetStep === 2) {
      if (audience === "branch_members" && !branchId) {
        setError("Choose a branch.");
        return false;
      }
      if (audience === "membership_plan" && !planId) {
        setError("Choose a plan.");
        return false;
      }
      if (audience === "single_member" && !singleUserId) {
        setError("Choose one member.");
        return false;
      }
      if (audience === "selected_members" && selectedUserIds.length === 0) {
        setError("Choose at least one member.");
        return false;
      }
      setError("");
      return true;
    }
    if (targetStep === 3) {
      return validateDraft();
    }
    setError("");
    return true;
  }

  async function loadPreview() {
    if (!validateDraft()) return;
    try {
      setPreviewLoading(true);
      setError("");
      setPreview(
        await webApiFetch<Preview>(`/api/orgs/${orgId}/notifications/preview`, {
          method: "POST",
          body: payload(),
        }),
      );
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to preview recipients.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function submitNotification() {
    if (!preview && !validateDraft()) return;
    try {
      setSending(true);
      setError("");
      await webApiFetch(`/api/orgs/${orgId}/notifications`, { method: "POST", body: payload() });
      if (saveAsTemplate && templateName.trim()) {
        await webApiFetch(`/api/orgs/${orgId}/notifications/templates`, {
          method: "POST",
          body: { name: templateName.trim(), title, body, type },
        });
      }
      await loadResources();
      setTitle("");
      setBody("");
      setType("OPERATIONAL");
      setAudience("all_active_members");
      setSaveAsTemplate(false);
      setTemplateName("");
      setPreview(null);
      setSendConfirmationOpen(false);
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <SectionHero
        eyebrow="Notifications"
        title="Send a message"
        description="Choose the purpose, audience, message, then review delivery. Drafts stay private until you confirm."
        icon={Send}
        tone="sky"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80">
              <PulseDot tone="sky" size={6} />
              Step {step} of 4
            </span>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Send a message</h2>
            <p className="mt-2 text-sm text-white/50">
              Choose the purpose, audience, message, then review delivery.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          {step === 1 ? (
            <MessageTypeStep
              type={type}
              typePermissions={typePermissions}
              onSelect={(nextType) => {
                setType(nextType);
                setPreview(null);
              }}
            />
          ) : null}

          {step === 2 ? (
            <AudienceStep
              audience={audience}
              availableAudiences={availableAudiences}
              branchId={branchId}
              branches={branches}
              daysAhead={daysAhead}
              members={members}
              planId={planId}
              plans={plans}
              selectedUserIds={selectedUserIds}
              singleUserId={singleUserId}
              onAudienceChange={(nextAudience) => {
                setAudience(nextAudience);
                setPreview(null);
              }}
              onBranchChange={setBranchId}
              onDaysAheadChange={setDaysAhead}
              onPlanChange={setPlanId}
              onSelectedUsersChange={setSelectedUserIds}
              onSingleUserChange={setSingleUserId}
            />
          ) : null}

          {step === 3 ? (
            <MessageDraftStep
              body={body}
              canManageTemplates={canManageTemplates}
              pushEnabled={pushEnabled}
              saveAsTemplate={saveAsTemplate}
              scheduleAt={scheduleAt}
              templateName={templateName}
              templates={templates}
              title={title}
              onApplyTemplate={applyTemplate}
              onBodyChange={(nextBody) => {
                setBody(nextBody);
                setPreview(null);
              }}
              onPushEnabledChange={setPushEnabled}
              onSaveAsTemplateChange={setSaveAsTemplate}
              onScheduleAtChange={setScheduleAt}
              onTemplateNameChange={setTemplateName}
              onTitleChange={(nextTitle) => {
                setTitle(nextTitle);
                setPreview(null);
              }}
            />
          ) : null}

          {step === 4 ? <ReviewStep body={body} preview={preview} title={title} /> : null}

          {error ? (
            <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
          {sendConfirmationOpen ? (
            <ConfirmDialog
              title={`Send to ${preview?.willDeliver ?? 0} members?`}
              description="Zook will prepare the message and send it through the active message service."
              confirmLabel="Send message"
              onCancel={() => setSendConfirmationOpen(false)}
              onConfirm={() => {
                setSendConfirmationOpen(false);
                void submitNotification();
              }}
            />
          ) : null}
          <div className="flex flex-wrap justify-between gap-3">
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => {
                setError("");
                setStep(Math.max(1, step - 1));
              }}
            >
              Back
            </ZookButton>
            <div className="flex flex-wrap gap-2">
              {step < 3 ? (
                <ZookButton
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!validateCurrentStep(step)) return;
                    setStep(step + 1);
                  }}
                >
                  Continue
                </ZookButton>
              ) : null}
              {step === 3 ? (
                <ZookButton
                  type="button"
                  size="sm"
                  onClick={() => void loadPreview()}
                  disabled={previewLoading}
                  state={previewLoading ? "loading" : "idle"}
                >
                  {previewLoading ? "Loading preview..." : "Preview recipients"}
                </ZookButton>
              ) : null}
              {step === 4 ? (
                <ZookButton
                  type="button"
                  size="sm"
                  onClick={() => setSendConfirmationOpen(true)}
                  disabled={sending || !preview?.willDeliver}
                  state={sending ? "loading" : "idle"}
                >
                  Send to {preview?.willDeliver ?? 0} members
                </ZookButton>
              ) : null}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold">Delivery history</h2>
        <ComposerDeliveryHistory notifications={notifications} />
      </GlassCard>
      </div>
    </div>
  );
}
