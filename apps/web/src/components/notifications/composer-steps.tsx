"use client";

import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { Pill } from "../glass-card";
import {
  memberLabel,
  messageTypes,
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
    <div className="grid gap-3 md:grid-cols-2">
      {messageTypes.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={!typePermissions.get(option.value)}
          onClick={() => onSelect(option.value)}
          className={`zook-focus rounded-[22px] border p-4 text-left transition ${
            type === option.value
              ? "border-lime-300 bg-lime-300/12"
              : "border-white/10 bg-black/20 hover:bg-white/6"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <p className="font-medium text-white">{option.label}</p>
          <p className="mt-1 text-sm text-white/45">{option.detail}</p>
          {!typePermissions.get(option.value) ? (
            <p className="mt-2 text-xs text-amber-100/80">Not available for your role</p>
          ) : null}
        </button>
      ))}
    </div>
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
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {availableAudiences.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={!option.allowed}
            onClick={() => onAudienceChange(option.value)}
            className={`zook-focus rounded-[22px] border px-4 py-3 text-left text-sm transition ${
              audience === option.value
                ? "border-lime-300 bg-lime-300/12 text-white"
                : "border-white/10 bg-black/20 text-white/65 hover:bg-white/6"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {option.label}
            {!option.allowed ? (
              <span className="mt-1 block text-xs text-amber-100/80">
                Not available for your role
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {audience === "branch_members" ? (
        <select
          value={branchId}
          onChange={(event) => onBranchChange(event.target.value)}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="" className="bg-black">
            Choose branch
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id} className="bg-black">
              {branch.name}
            </option>
          ))}
        </select>
      ) : null}
      {audience === "membership_plan" ? (
        <select
          value={planId}
          onChange={(event) => onPlanChange(event.target.value)}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="" className="bg-black">
            Choose plan
          </option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id} className="bg-black">
              {plan.name}
            </option>
          ))}
        </select>
      ) : null}
      {audience === "single_member" ? (
        <select
          value={singleUserId}
          onChange={(event) => onSingleUserChange(event.target.value)}
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="" className="bg-black">
            Choose member
          </option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId} className="bg-black">
              {memberLabel(member)}
            </option>
          ))}
        </select>
      ) : null}
      {audience === "selected_members" ? (
        <select
          multiple
          value={selectedUserIds}
          onChange={(event) =>
            onSelectedUsersChange(
              Array.from(event.target.selectedOptions).map((option) => option.value),
            )
          }
          className="zook-focus min-h-40 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {memberLabel(member)}
            </option>
          ))}
        </select>
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
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onApplyTemplate(template)}
            className="zook-focus rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70 transition hover:bg-white/8"
          >
            {template.name}
          </button>
        ))}
      </div>
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
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
      </div>
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
        <Pill tone="blue">{preview?.resolvedRecipients ?? 0} matched</Pill>
        <Pill tone="lime">{preview?.willDeliver ?? 0} will receive</Pill>
        <Pill tone="amber">{preview?.blockedByOptOut ?? 0} opted out</Pill>
        <Pill tone="neutral">{preview?.blockedByMinor ?? 0} minors skipped</Pill>
      </div>
      {preview?.blockedByOptOut ? (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {preview.blockedByOptOut} of {preview.resolvedRecipients} members have opted out and will
          not receive this.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Pill tone="blue">{preview?.budget?.senderRemaining ?? 0} sender left</Pill>
        <Pill tone="lime">{preview?.budget?.orgAllRemaining ?? 0} gym left</Pill>
        <Pill tone="amber">{preview?.budget?.orgPromoRemaining ?? 0} announcements left</Pill>
        <Pill tone="neutral">{preview?.budget?.orgOperationalRemaining ?? 0} updates left</Pill>
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
            className="rounded-[22px] border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">{notification.title}</p>
              <Pill tone={notification.status === "SENT" ? "lime" : "amber"}>
                {formatEnumLabel(notification.status)}
              </Pill>
            </div>
            <p className="mt-2 text-sm text-white/55">{notification.body}</p>
            <p className="mt-2 text-xs text-white/40">
              {formatEnumLabel(notification.type)} · {formatEnumLabel(notification.audience)} ·{" "}
              {formatDateTime(notification.createdAt)}
            </p>
            <p className="mt-2 text-xs text-white/40">
              {notification.createdByName ? `Sent by ${notification.createdByName} · ` : ""}
              {notification.recipientStats?.total ?? 0} recipients ·{" "}
              {notification.recipientStats?.delivered ?? 0} delivered ·{" "}
              {notification.recipientStats?.read ?? 0} read ({readPercent(notification)}%) ·{" "}
              {notification.recipientStats?.failed ?? 0} failed
              {notification.recipientStats?.scheduled
                ? ` · ${notification.recipientStats.scheduled} scheduled`
                : ""}
            </p>
          </div>
        ))
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
          Messages you send will appear here.
        </p>
      )}
    </div>
  );
}
