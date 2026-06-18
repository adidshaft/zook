"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarCheck,
  Globe2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@zook/core";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { GlassCard, Pill } from "../../glass-card";
import type {
  BranchScopeSnapshot,
  OrganizationSnapshot,
  OrganizationSummary,
} from "@/components/dashboard/types";

const copy = {
  settingsEyebrow: "Settings",
  settingsTitle: "Gym controls",
  settingsDescription: "Keep attendance, messages, and integrations understandable for your team.",
  attendanceMode: "Attendance mode",
  notificationLimits: "Message limits",
  integrations: "Integrations",
  paymentProvider: "Payment partner",
  pushProvider: "Push alerts",
  configured: "Configured",
};

type SettingsHubCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission | undefined;
  badge?: string | undefined;
  urgent?: boolean | undefined;
};

export function SettingsSection({
  orgId,
  organization,
  summary,
  branchScope,
  permissions,
}: {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  permissions: Permission[];
}) {
  const allowed = new Set(permissions);
  const canOpen = (permission?: Permission) => !permission || allowed.has(permission);
  const needsBillingSetup = ["TRIAL_ACTIVE", "TRIAL_EXPIRING", "TRIAL_EXPIRED", "PAYMENT_PENDING"].includes(
    organization.status,
  );
  
  const settingsHubCards: SettingsHubCard[] = [
    {
      title: "Billing, plan, and autopay",
      description:
        "Add billing details, choose Starter/Growth/Pro, complete the Razorpay mandate, and view invoices.",
      href: "/dashboard/billing",
      icon: ReceiptText,
      permission: "ORG_MANAGE_BILLING",
      badge: needsBillingSetup ? "Action needed" : "Ready",
      urgent: needsBillingSetup,
    },
    {
      title: "Organization profile",
      description:
        "Edit gym name, public username, contact details, join mode, photos, app links, and QR pages.",
      href: "/dashboard/public-profile",
      icon: Globe2,
      permission: "ORG_MANAGE_PROFILE",
      badge: organization.city || "Profile",
    },
    {
      title: "Branches and locations",
      description:
        "Add a branch, assign managers, set hours, pause locations, and choose the default branch.",
      href: "/dashboard/branches",
      icon: MapPin,
      permission: "ORG_MANAGE_LOCATION",
      badge: `${branchScope.branches.length} active`,
      urgent: branchScope.branches.length === 0,
    },
    {
      title: "Staff and permissions",
      description: "Invite admins, receptionists, and trainers with the right branch access.",
      href: "/dashboard/staff",
      icon: Users,
      permission: "ORG_MANAGE_STAFF",
      badge: `${summary.staffCount} team`,
    },
    {
      title: "Attendance controls",
      description: "Open QR attendance, approval queues, and branch-level check-in review.",
      href: "/dashboard/attendance",
      icon: CalendarCheck,
      permission: "ATTENDANCE_QR_DISPLAY",
      badge: formatEnumLabel(organization.attendanceMode),
    },
    {
      title: "Messages and templates",
      description: "Prepare reusable templates and send member updates to selected audiences.",
      href: "/dashboard/notifications/templates",
      icon: Bell,
      permission: "NOTIFICATION_MANAGE_TEMPLATES",
      badge: "Templates",
    },
    {
      title: "Activity and audit trail",
      description: "Review sensitive changes, actor history, and assistant drafts needing review.",
      href: "/dashboard/audit",
      icon: ShieldCheck,
      permission: "PRIVACY_VIEW_AUDIT",
      badge: "Activity",
    },
  ];
  
  const hubCards = settingsHubCards.filter((card) => canOpen(card.permission));
  const integrations = [
    [copy.paymentProvider, process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL ?? copy.configured],
    [copy.pushProvider, copy.configured],
  ];
  
  return (
    <div className="grid gap-4">
      <GlassCard variant="strong">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              {copy.settingsEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Owner control center
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Billing, organization profile, branch setup, team access, attendance, and message
              controls live here. Use the cards below to jump directly to the workflow you need.
            </p>
          </div>
          {needsBillingSetup ? (
            <Link
              href="/dashboard/billing"
              className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-sm)] transition hover:brightness-105"
            >
              Add billing now
            </Link>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {hubCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group zook-focus rounded-[24px] border p-4 transition hover:-translate-y-0.5 hover:bg-[var(--bg-sunken)] ${
                card.urgent
                  ? "border-[var(--feedback-warning)]/35 bg-[var(--surface-warning-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-raised)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)]">
                  <Icon size={18} />
                </span>
                {card.badge ? (
                  <Pill tone={card.urgent ? "amber" : "neutral"}>{card.badge}</Pill>
                ) : null}
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {card.description}
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
                Open →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <GlassCard>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)]">
              <Building2 size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Organization snapshot
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {organization.name} · {organization.city}
                {organization.state ? `, ${organization.state}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Status", formatEnumLabel(organization.status)],
              ["Join mode", formatEnumLabel(organization.joinMode)],
              ["Attendance", formatEnumLabel(organization.attendanceMode)],
              ["Active members", formatEnumLabel(String(summary.activeMembers))],
              ["Selected branch", branchScope.selectedBranch?.name ?? "All branches"],
              ["Trial ends", organization.trialEndAt ? formatDate(organization.trialEndAt) : "Active"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {label}
                </p>
                <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.integrations}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Provider status is managed centrally; billing and messaging setup links are available
            above.
          </p>
          <div className="mt-4 grid gap-3">
            {integrations.map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  {label}
                </p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">Organization ID: {orgId}</p>
        </GlassCard>
      </div>
    </div>
  );
}
