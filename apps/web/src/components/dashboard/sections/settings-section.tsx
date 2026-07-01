"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarCheck,
  Globe2,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@zook/core";
import { formatCompactNumber, formatDate, formatEnumLabel } from "@/lib/format";
import { GlassCard } from "../../glass-card";
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

function CompactBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "amber";
}) {
  return (
    <span
      className={`inline-flex max-w-[9rem] items-center justify-center truncate rounded-full border px-2 py-1 text-[11px] font-semibold ${
        tone === "amber"
          ? "border-[color-mix(in_srgb,var(--feedback-warning)_40%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
          : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
      }`}
      title={children}
    >
      {children}
    </span>
  );
}

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
      badge: needsBillingSetup ? "Action needed" : "Configured",
      urgent: needsBillingSetup,
    },
    {
      title: "Gym profile",
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
        "Add a branch, paste its Google Maps link, assign managers, set hours, and choose the main branch.",
      href: "/dashboard/branches",
      icon: Building2,
      permission: "ORG_MANAGE_LOCATION",
      badge: `${formatCompactNumber(branchScope.branches.length)} ${
        branchScope.branches.length === 1 ? "branch" : "branches"
      }`,
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
      title: "Push devices",
      description: "Review registered push devices, revoke stale tokens, and prepare browser push registration.",
      href: "/dashboard/settings/push",
      icon: Bell,
      permission: "NOTIFICATION_MANAGE_TEMPLATES",
      badge: copy.configured,
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
  const primaryHubCard =
    hubCards.find((card) => card.urgent) ??
    hubCards.find((card) => card.href === "/dashboard/public-profile") ??
    hubCards[0];
  const secondaryHubCards = primaryHubCard
    ? hubCards.filter((card) => card.href !== primaryHubCard.href)
    : hubCards;
  const integrations = [
    [copy.paymentProvider, process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL ?? copy.configured],
    [copy.pushProvider, copy.configured],
  ];
  
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Owner controls and setup status.</p>
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

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        {primaryHubCard ? (
          <Link
            href={primaryHubCard.href}
            className={`group zook-focus rounded-[20px] border px-4 py-3 transition hover:bg-[var(--bg-sunken)] ${
              primaryHubCard.urgent
                ? "border-[var(--feedback-warning)]/35 bg-[var(--surface-warning-soft)]"
                : "border-[var(--border)] bg-[var(--surface-raised)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)]">
                <primaryHubCard.icon size={17} />
              </span>
              {primaryHubCard.badge ? (
                <CompactBadge tone={primaryHubCard.urgent ? "amber" : "neutral"}>
                  {primaryHubCard.badge}
                </CompactBadge>
              ) : null}
            </div>
            <p className="mt-4 text-xs font-medium text-[var(--text-tertiary)]">Next setup step</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {primaryHubCard.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
              {primaryHubCard.description}
            </p>
            <span className="mt-4 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
              Open setup →
            </span>
          </Link>
        ) : null}

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Owner controls</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Daily operations, profile, team, and audit.</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {secondaryHubCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group zook-focus grid gap-3 px-4 py-3 transition hover:bg-[var(--bg-sunken)] sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]">
                    <Icon size={17} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">
                      {card.title}
                    </span>
                    <span className="mt-1 block line-clamp-1 text-xs leading-5 text-[var(--text-tertiary)]">
                      {card.description}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3 sm:justify-end">
                    {card.badge ? (
                      <CompactBadge tone={card.urgent ? "amber" : "neutral"}>{card.badge}</CompactBadge>
                    ) : null}
                    <span className="text-xs font-semibold text-[var(--accent-strong)]">Open →</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Gym overview</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Status", formatEnumLabel(organization.status)],
              ["Join mode", formatEnumLabel(organization.joinMode)],
              ["Attendance", formatEnumLabel(organization.attendanceMode)],
              ["Active members", formatCompactNumber(summary.activeMembers)],
              ["Trial ends", organization.trialEndAt ? formatDate(organization.trialEndAt) : "Active"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]" title={value}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{copy.integrations}</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            Service status is managed centrally; billing and messaging links are available
            above.
          </p>
          <div className="mt-4 grid gap-2">
            {integrations.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
                <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
                <p className="truncate text-sm font-medium text-[var(--text-primary)]" title={value}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">Organization ID: {orgId}</p>
        </GlassCard>
      </div>
    </div>
  );
}
