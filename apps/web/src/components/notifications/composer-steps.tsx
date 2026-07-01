"use client";

import { useState } from "react";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { ConfirmDialog } from "../dashboard-primitives";
import { RadioCardGroup, SearchableSelect } from "../ui";
import { Pill } from "../glass-card";
import {
  memberDescription,
  memberLabel,
  memberUserId,
  messageTypes,
  toneForNotificationStatus,
  type Audience,
  type BranchRow,
  type MemberRow,
  type NotificationRow,
  type NotificationType,
  type PlanRow,
  type Preview,
  type TemplateRow,
} from "./shared";

type AudienceOption = {
  value: Audience;
  label: string;
  allowed: boolean;
};

function composerNotificationStatusLabel(status: string | null | undefined) {
  if (status === "SENT") return "Sent";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "FAILED") return "Failed";
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  return formatEnumLabel(status ?? "message");
}

function composerNotificationTypeLabel(type: string | null | undefined) {
  if (type === "PROMOTIONAL") return "Announcement";
  if (type === "OPERATIONAL") return "Update";
  if (type === "TRANSACTIONAL") return "Transactional";
  return formatEnumLabel(type ?? "message");
}

function composerAudienceLabel(audience: string | null | undefined) {
  if (audience === "ALL_MEMBERS") return "All members";
  if (audience === "ACTIVE_MEMBERS") return "Active members";
  if (audience === "EXPIRING_MEMBERS") return "Expiring members";
  if (audience === "INACTIVE_MEMBERS") return "Inactive members";
  if (audience === "SELECTED_MEMBERS") return "Selected members";
  return formatEnumLabel(audience ?? "members");
}

export function MessageTypeStep({
  type,
  typePermissions,
  onSelect,
}: {
  type: NotificationType;
  typePermissions: Map<NotificationType, boolean>;
  onSelect: (type: NotificationType) => void;
}) {
  return (
    <RadioCardGroup
      name="notification-type"
      label="Notification type"
      value={type}
      onChange={(nextType) => onSelect(nextType)}
      options={messageTypes.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.detail,
        disabled: !typePermissions.get(option.value),
      }))}
    />
  );
}

export function AudienceStep({
  audience,
  availableAudiences,
  branchId,
  branches,
  daysAhead,
  members,
  planId,
  plans,
  selectedUserIds,
  singleUserId,
  onAudienceChange,
  onBranchChange,
  onDaysAheadChange,
  onPlanChange,
  onSelectedUsersChange,
  onSingleUserChange,
}: {
  audience: Audience;
  availableAudiences: AudienceOption[];
  branchId: string;
  branches: BranchRow[];
  daysAhead: string;
  members: MemberRow[];
  planId: string;
  plans: PlanRow[];
  selectedUserIds: string[];
  singleUserId: string;
  onAudienceChange: (audience: Audience) => void;
  onBranchChange: (branchId: string) => void;
  onDaysAheadChange: (daysAhead: string) => void;
  onPlanChange: (planId: string) => void;
  onSelectedUsersChange: (userIds: string[]) => void;
  onSingleUserChange: (userId: string) => void;
}) {
  const memberOptions = members.flatMap((member) => {
    const value = memberUserId(member);
    if (!value) return [];
    return [{ value, label: memberLabel(member), description: memberDescription(member) }];
  });
  const selectedMembers = selectedUserIds
    .map((userId) => members.find((member) => memberUserId(member) === userId))
    .filter((member): member is MemberRow => Boolean(member));

  return (
    <div className="grid gap-3">
      <RadioCardGroup
        name="notification-audience"
        label="Notification audience"
        value={audience}
        onChange={(nextAudience) => onAudienceChange(nextAudience)}
        options={availableAudiences.map((option) => ({
          value: option.value,
          label: option.label,
          description: option.allowed ? undefined : "Not available for your role",
          disabled: !option.allowed,
        }))}
      />
      {audience === "branch_members" ? (
        <SearchableSelect
          label="Choose branch"
          placeholder="Choose branch"
          searchPlaceholder="Search branches"
          options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
          value={branchId}
          onChange={onBranchChange}
        />
      ) : null}
      {audience === "membership_plan" ? (
        <SearchableSelect
          label="Choose plan"
          placeholder="Choose plan"
          searchPlaceholder="Search plans"
          options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
          value={planId}
          onChange={onPlanChange}
        />
      ) : null}
      {audience === "single_member" ? (
        <SearchableSelect
          label="Choose member"
          placeholder="Choose member"
          searchPlaceholder="Search members"
          options={memberOptions}
          value={singleUserId}
          onChange={onSingleUserChange}
        />
      ) : null}
      {audience === "selected_members" ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white/70">Selected recipients</p>
            <Pill>
              {selectedUserIds.length} selected
            </Pill>
          </div>
          <SearchableSelect
            label="Choose members"
            placeholder="Choose members"
            searchPlaceholder="Search by member name or phone"
            emptyLabel="No members match"
            multiple
            values={selectedUserIds}
            options={memberOptions}
            onValuesChange={onSelectedUsersChange}
          />
          {selectedMembers.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <button
                  key={memberUserId(member)}
                  type="button"
                  onClick={() =>
                    onSelectedUsersChange(
                      selectedUserIds.filter((id) => id !== memberUserId(member)),
                    )
                  }
                  className="zook-focus rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/65"
                >
                  {memberLabel(member)} · Remove
                </button>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-white/42">
            Large gyms currently load the first 100 members here; use branch or plan audiences for
            broad sends.
          </p>
        </div>
      ) : null}
      {audience === "expiring_soon" ? (
        <label className="grid gap-2 text-sm text-white/55">
          Days ahead
          <select
            value={daysAhead}
            onChange={(event) => onDaysAheadChange(event.target.value)}
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          >
            <option value="7" className="bg-black">
              7 days
            </option>
            <option value="15" className="bg-black">
              15 days
            </option>
            <option value="30" className="bg-black">
              30 days
            </option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function MessageDraftStep({
  body,
  canManageTemplates,
  pushEnabled,
  saveAsTemplate,
  scheduleAt,
  templateName,
  templates,
  title,
  onApplyTemplate,
  onBodyChange,
  onPushEnabledChange,
  onSaveAsTemplateChange,
  onScheduleAtChange,
  onTemplateNameChange,
  onTitleChange,
}: {
  body: string;
  canManageTemplates: boolean;
  pushEnabled: boolean;
  saveAsTemplate: boolean;
  scheduleAt: string;
  templateName: string;
  templates: TemplateRow[];
  title: string;
  onApplyTemplate: (template: TemplateRow) => void;
  onBodyChange: (body: string) => void;
  onPushEnabledChange: (enabled: boolean) => void;
  onSaveAsTemplateChange: (save: boolean) => void;
  onScheduleAtChange: (scheduleAt: string) => void;
  onTemplateNameChange: (templateName: string) => void;
  onTitleChange: (title: string) => void;
}) {
  const hasDraft = title.trim().length > 0 || body.trim().length > 0;
  const [pendingTemplate, setPendingTemplate] = useState<TemplateRow | null>(null);
  const scheduleError =
    scheduleAt && new Date(scheduleAt).getTime() <= Date.now()
      ? "Schedule must be in the future. Leave blank to send now."
      : "";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              if (hasDraft) {
                setPendingTemplate(template);
                return;
              }
              onApplyTemplate(template);
            }}
            className="zook-focus rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70 transition hover:bg-white/8"
          >
            {template.name}
          </button>
        ))}
      </div>
      {pendingTemplate ? (
        <ConfirmDialog
          title="Apply saved template?"
          description="This replaces the title and message draft."
          confirmLabel="Apply template"
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            onApplyTemplate(pendingTemplate);
            setPendingTemplate(null);
          }}
        />
      ) : null}
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Title"
        maxLength={120}
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
      />
      <textarea
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        placeholder="Message"
        maxLength={1000}
        rows={5}
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
      />
      <p className="text-xs text-white/42">{body.length}/1000 characters</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(event) => onPushEnabledChange(event.target.checked)}
          />
          Send push notification
        </label>
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(event) => onScheduleAtChange(event.target.value)}
          aria-invalid={Boolean(scheduleError)}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
      </div>
      <p className={scheduleError ? "text-xs text-red-200" : "text-xs text-white/42"}>
        {scheduleError || "Schedule must be in the future. Leave blank to send now."}
      </p>
      {canManageTemplates ? (
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(event) => onSaveAsTemplateChange(event.target.checked)}
          />
          Save as template
        </label>
      ) : null}
      {canManageTemplates && saveAsTemplate ? (
        <input
          value={templateName}
          onChange={(event) => onTemplateNameChange(event.target.value)}
          placeholder="Template name"
          maxLength={80}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
      ) : null}
    </div>
  );
}

export function ReviewStep({
  body,
  preview,
  title,
}: {
  body: string;
  preview: Preview | null;
  title: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-white/35">Phone preview</p>
        <p className="mt-3 font-semibold text-white">{title || "Title"}</p>
        <p className="mt-2 text-sm text-white/65">{body || "Message"}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Pill>{preview?.resolvedRecipients ?? 0} matched</Pill>
        <Pill>{preview?.willDeliver ?? 0} will receive</Pill>
        <Pill>{preview?.blockedByOptOut ?? 0} opted out</Pill>
      </div>
      {preview?.blockedByOptOut ? (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {preview.blockedByOptOut} of {preview.resolvedRecipients} members have opted out and will
          not receive this.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Pill>{preview?.budget?.senderRemaining ?? 0} sender left</Pill>
        <Pill>{preview?.budget?.orgAllRemaining ?? 0} gym left</Pill>
        <Pill>{preview?.budget?.orgPromoRemaining ?? 0} announcements left</Pill>
        <Pill>{preview?.budget?.orgOperationalRemaining ?? 0} updates left</Pill>
      </div>
    </div>
  );
}

export function ComposerDeliveryHistory({ notifications }: { notifications: NotificationRow[] }) {
  function readPercent(notification: NotificationRow) {
    const stats = notification.recipientStats;
    if (!stats?.delivered) return 0;
    return Math.round((stats.read / stats.delivered) * 100);
  }

  return (
    <div className="mt-5 grid gap-3">
      {notifications.length ? (
        notifications.slice(0, 8).map((notification) => (
          <div
            key={notification.id}
            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 truncate font-medium text-white">{notification.title}</p>
              <Pill tone={toneForNotificationStatus(notification.status)}>
                {composerNotificationStatusLabel(notification.status)}
              </Pill>
            </div>
            <p className="mt-1 text-xs text-white/45">
              {composerNotificationTypeLabel(notification.type)} · {composerAudienceLabel(notification.audience)} ·{" "}
              {formatDateTime(notification.createdAt)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {notification.createdByName ? `Sent by ${notification.createdByName} · ` : ""}
              {(notification.recipientStats?.failed ?? 0) > 0
                ? `${notification.recipientStats?.failed ?? 0} failed · `
                : ""}
              {notification.recipientStats?.delivered ?? 0}/{notification.recipientStats?.total ?? 0} delivered
              {(notification.recipientStats?.read ?? 0) > 0
                ? ` · ${readPercent(notification)}% read`
                : ""}
              {notification.recipientStats?.scheduled ? ` · ${notification.recipientStats.scheduled} scheduled` : ""}
            </p>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
          No sent messages.
        </p>
      )}
    </div>
  );
}
