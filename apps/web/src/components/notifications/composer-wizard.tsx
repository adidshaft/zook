"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Permission } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import { ConfirmDialog } from "../dashboard-primitives";
import { Send } from "lucide-react";
import { GlassCard } from "../glass-card";
import { SectionHero, StatusDot } from "../dashboard/charts";
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
  permissions = [],
}: {
  orgId: string;
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
              permissions,
              type: option.value,
              audience: permissionAudience(candidate.value),
            }),
          ),
        ]),
      ),
    [permissions],
  );
  const availableAudiences = useMemo(
    () =>
      audienceOptions(type).map((option) => ({
        ...option,
        allowed: canUseNotificationOption({
          permissions,
          type,
          audience: permissionAudience(option.value),
        }),
      })),
    [permissions, type],
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
    if (scheduleAt && new Date(scheduleAt).getTime() <= Date.now()) {
      setError("Schedule must be in the future. Leave blank to send now.");
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
        icon={Send}
        tone="sky"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80">
              <StatusDot tone="sky" size={6} />
              Step {step} of 4
            </span>
          </div>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <GlassCard>
        <div className="grid gap-4">
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
              description="Zook prepares the message and sends it through the active message service."
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

      <GlassCard className="p-4">
        <ComposerReadinessPanel
          audienceLabel={
            availableAudiences.find((option) => option.value === audience)?.label ?? audience
          }
          audienceReady={validateAudienceReady({
            audience,
            branchId,
            planId,
            selectedUserIds,
            singleUserId,
          })}
          draftReady={Boolean(title.trim() && body.trim())}
          preview={preview}
          pushEnabled={pushEnabled}
          recentNotificationCount={notifications.slice(0, 7).length}
          templateCount={templates.length}
          scheduleReady={!scheduleAt || new Date(scheduleAt).getTime() > Date.now()}
          step={step}
        />
        <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-white">
            Delivery history
            <span className="ml-2 text-xs font-normal text-white/45">
              {notifications.length} recent
            </span>
          </summary>
          <div className="mt-3">
          <ComposerDeliveryHistory notifications={notifications} />
          </div>
        </details>
      </GlassCard>
      </div>
    </div>
  );
}

function validateAudienceReady({
  audience,
  branchId,
  planId,
  selectedUserIds,
  singleUserId,
}: {
  audience: Audience;
  branchId: string;
  planId: string;
  selectedUserIds: string[];
  singleUserId: string;
}) {
  if (audience === "branch_members") return Boolean(branchId);
  if (audience === "membership_plan") return Boolean(planId);
  if (audience === "single_member") return Boolean(singleUserId);
  if (audience === "selected_members") return selectedUserIds.length > 0;
  return true;
}

function ComposerReadinessPanel({
  audienceLabel,
  audienceReady,
  draftReady,
  preview,
  pushEnabled,
  recentNotificationCount,
  scheduleReady,
  step,
  templateCount,
}: {
  audienceLabel: string;
  audienceReady: boolean;
  draftReady: boolean;
  preview: Preview | null;
  pushEnabled: boolean;
  recentNotificationCount: number;
  scheduleReady: boolean;
  step: number;
  templateCount: number;
}) {
  const readiness = [
    {
      label: "Audience",
      ready: audienceReady,
      detail: audienceReady ? audienceLabel : "Choose the required audience detail.",
    },
    {
      label: "Message",
      ready: draftReady,
      detail: draftReady ? "Title and body are ready." : "Add a title and message body.",
    },
    {
      label: "Timing",
      ready: scheduleReady,
      detail: scheduleReady ? "Send now or future schedule is valid." : "Move schedule to the future.",
    },
    {
      label: "Recipient preview",
      ready: Boolean(preview?.willDeliver),
      detail: preview
        ? `${preview.willDeliver} of ${preview.resolvedRecipients} members will receive this.`
        : "Preview recipients before sending.",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Send readiness</h2>
          <p className="mt-1 text-xs text-white/45">Preview recipients before sending.</p>
        </div>
        <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70">
          Step {step}/4
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          {
            label: "Saved templates",
            value: templateCount,
          },
          {
            label: "Recent sends",
            value: recentNotificationCount,
          },
          {
            label: "Push channel",
            value: pushEnabled ? "On" : "Off",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"
          >
            <p className="text-[11px] font-medium text-white/35">
              {item.label}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-white">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  item.ready
                    ? "bg-lime-300/10 text-lime-100"
                    : "bg-amber-300/10 text-amber-100"
                }`}
              >
                {item.ready ? "Ready" : "Needed"}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-white/50">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
