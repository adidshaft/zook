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
import { useT } from "@/lib/use-t";

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
  const t = useT("settings");
  const allowed = new Set(permissions);
  const canOpen = (permission?: Permission) => !permission || allowed.has(permission);
  const needsBillingSetup = ["TRIAL_ACTIVE", "TRIAL_EXPIRING", "TRIAL_EXPIRED", "PAYMENT_PENDING"].includes(
    organization.status,
  );
  
  const settingsHubCards: SettingsHubCard[] = [
    {
      title: t("billingPlanAutopay"),
      description: t("billingPlanAutopayDescription"),
      href: "/dashboard/billing",
      icon: ReceiptText,
      permission: "ORG_MANAGE_BILLING",
      badge: needsBillingSetup ? t("actionNeeded") : t("configured"),
      urgent: needsBillingSetup,
    },
    {
      title: t("gymProfile"),
      description: t("gymProfileDescription"),
      href: "/dashboard/public-profile",
      icon: Globe2,
      permission: "ORG_MANAGE_PROFILE",
      badge: organization.city || t("profile"),
    },
    {
      title: t("branchesLocations"),
      description: t("branchesLocationsDescription"),
      href: "/dashboard/branches",
      icon: Building2,
      permission: "ORG_MANAGE_LOCATION",
      badge: `${formatCompactNumber(branchScope.branches.length)} ${
        branchScope.branches.length === 1 ? t("branchOne") : t("branchOther")
      }`,
      urgent: branchScope.branches.length === 0,
    },
    {
      title: t("staffPermissions"),
      description: t("staffPermissionsDescription"),
      href: "/dashboard/staff",
      icon: Users,
      permission: "ORG_MANAGE_STAFF",
      badge: t("teamCount", { count: summary.staffCount }),
    },
    {
      title: t("attendanceControls"),
      description: t("attendanceControlsDescription"),
      href: "/dashboard/attendance",
      icon: CalendarCheck,
      permission: "ATTENDANCE_QR_DISPLAY",
      badge: formatEnumLabel(organization.attendanceMode),
    },
    {
      title: t("messagesTemplates"),
      description: t("messagesTemplatesDescription"),
      href: "/dashboard/notifications/templates",
      icon: Bell,
      permission: "NOTIFICATION_MANAGE_TEMPLATES",
      badge: t("templates"),
    },
    {
      title: t("pushDevices"),
      description: t("pushDevicesDescription"),
      href: "/dashboard/settings/push",
      icon: Bell,
      permission: "NOTIFICATION_MANAGE_TEMPLATES",
      badge: t("configured"),
    },
    {
      title: t("activityAuditTrail"),
      description: t("activityAuditTrailDescription"),
      href: "/dashboard/audit",
      icon: ShieldCheck,
      permission: "PRIVACY_VIEW_AUDIT",
      badge: t("activity"),
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
    [t("paymentProvider"), process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL ?? t("configured")],
    [t("pushProvider"), t("configured")],
  ];
  
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("settings")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("ownerControlsSetupStatus")}</p>
        </div>
        {needsBillingSetup ? (
          <Link
            href="/dashboard/billing"
            className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-sm)] transition hover:brightness-105"
          >
            {t("addBillingNow")}
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
            <p className="mt-4 text-xs font-medium text-[var(--text-tertiary)]">{t("nextSetupStep")}</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {primaryHubCard.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
              {primaryHubCard.description}
            </p>
            <span className="mt-4 inline-flex text-xs font-semibold text-[var(--accent-strong)]">
              {t("openSetup")}
            </span>
          </Link>
        ) : null}

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("ownerControls")}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{t("ownerControlsDescription")}</p>
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
                    <span className="text-xs font-semibold text-[var(--accent-strong)]">{t("open")}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <GlassCard>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("gymOverview")}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [t("status"), formatEnumLabel(organization.status)],
              [t("joinMode"), formatEnumLabel(organization.joinMode)],
              [t("attendance"), formatEnumLabel(organization.attendanceMode)],
              [t("activeMembers"), formatCompactNumber(summary.activeMembers)],
              [t("trialEnds"), organization.trialEndAt ? formatDate(organization.trialEndAt) : t("active")],
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
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("integrations")}</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            {t("integrationsDescription")}
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
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">{t("organizationId", { id: orgId })}</p>
        </GlassCard>
      </div>
    </div>
  );
}
