import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Circle,
  ClipboardList,
  Dumbbell,
  FileText,
  Globe2,
  History,
  type LucideIcon,
  QrCode,
  ReceiptText,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { formatBranchName, joinModeLabel, permissionsForRoles } from "@zook/core";
import {
  EmptyState,
  MetricCard,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "./dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "./glass-card";
import { DashboardOperationalPanelShell } from "./dashboard-operational-panel-shell";
import { DashboardLocaleToggle } from "./dashboard-locale-toggle";
import { DashboardSignOutButton } from "./dashboard-sign-out-button";
import { ZookLogo } from "./zook-logo";
import { ZookButtonLink } from "./zook-button";
import { formatDate, formatDaysRemaining, formatEnumLabel, titleFromSection } from "@/lib/format";
import type { Permission, Role } from "@zook/core";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  permissions?: Permission[];
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operations",
    items: [
      { key: "today", label: "Today", href: "/dashboard", icon: Dumbbell },
      {
        key: "attendance",
        label: "Attendance",
        href: "/dashboard/attendance",
        icon: QrCode,
        permissions: ["ATTENDANCE_QR_DISPLAY", "ATTENDANCE_APPROVE"],
      },
      {
        key: "payments",
        label: "Payments",
        href: "/dashboard/payments",
        icon: ReceiptText,
        permissions: ["PAYMENTS_VIEW"],
      },
      {
        key: "shop",
        label: "Shop",
        href: "/dashboard/shop/products",
        icon: Store,
        permissions: ["SHOP_MANAGE_PRODUCTS"],
      },
      {
        key: "reports",
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        permissions: ["ORG_VIEW_REPORTS"],
      },
    ],
  },
  {
    label: "Members",
    items: [
      {
        key: "members",
        label: "Members",
        href: "/dashboard/members",
        icon: Users,
        permissions: ["MEMBERS_VIEW"],
      },
      {
        key: "plans",
        label: "Plans",
        href: "/dashboard/membership-plans",
        icon: ClipboardList,
        permissions: ["MEMBERSHIP_PLAN_MANAGE"],
      },
      {
        key: "team",
        label: "Team",
        href: "/dashboard/staff",
        icon: Shield,
        permissions: ["ORG_MANAGE_STAFF"],
      },
    ],
  },
  {
    label: "Messages",
    items: [
      {
        key: "messages",
        label: "Messages",
        href: "/dashboard/notifications",
        icon: Bell,
        permissions: ["NOTIFICATION_CREATE_DRAFT"],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        key: "branches",
        label: "Branches",
        href: "/dashboard/branches",
        icon: Globe2,
        permissions: ["ORG_MANAGE_LOCATION"],
      },
      {
        key: "gymProfile",
        label: "Gym profile",
        href: "/dashboard/public-profile",
        icon: Globe2,
        permissions: ["ORG_MANAGE_PROFILE"],
      },
      {
        key: "activity",
        label: "Audit log",
        href: "/dashboard/audit",
        icon: History,
        shortLabel: "Activity",
        permissions: ["PRIVACY_VIEW_AUDIT"],
      },
    ],
  },
];

const dashboardTranslations = {
  en: {
    navGroups: {
      Operations: "Operations",
      Members: "Members",
      Messages: "Messages",
      Settings: "Settings",
    },
    nav: {
      today: "Today",
      attendance: "Attendance",
      payments: "Payments",
      shop: "Shop",
      reports: "Reports",
      members: "Members",
      plans: "Plans",
      team: "Team",
      messages: "Messages",
      branches: "Branches",
      gymProfile: "Gym profile",
      activity: "Activity",
    },
    liveWorkspace: "Live workspace",
    sampleData: "Sample data",
    noOrgTitle: "No active gym is available",
    noOrgDescription:
      "Your sign-in is active, but no gym is connected to this account yet. Owners can create a gym profile from setup.",
    startGym: "Start a gym",
    liveOrganization: "Live gym",
    gymStatus: "Gym status",
    branchScope: "Branch scope",
    branchScopeMeta: "The app uses this branch for check-ins and plans.",
    attendanceMode: "Attendance mode",
    trialRunway: "Trial runway",
    primaryContact: "Primary contact",
    todayAt: "Today at",
    todayDescription: "Check-ins, members, payments, stock, and follow-ups in one owner view.",
    sectionDescription: "Run daily gym work here. Changes save automatically in Zook.",
    showQr: "Show QR",
    reports: "Reports",
    needsAttention: "Needs attention",
    needsAttentionDescription: "Quick links to what needs attention today.",
    showEntryQr: "Show entry QR",
    reviewJoins: "Review joins",
    checkStock: "Check stock",
    reviewActivity: "Review activity",
    scansToday: "scans today",
    membershipRequests: "membership requests",
    lowStockItems: "low-stock items",
    activityEntries: "activity entries",
    location: "Location",
    locationMeta: "Current city",
    showingBranch: "Showing data for the active branch",
    joinMode: "Join mode",
    inboundRequests: "inbound requests",
    checkInsToday: "check-ins today",
    trialEnd: "Trial end",
  },
  hi: {
    navGroups: {
      Operations: "काम",
      Members: "मेंबर",
      Messages: "मैसेज",
      Settings: "सेटिंग",
    },
    nav: {
      today: "आज",
      attendance: "अटेंडेंस",
      payments: "पेमेंट",
      shop: "शॉप",
      reports: "रिपोर्ट",
      members: "मेंबर",
      plans: "प्लान",
      team: "टीम",
      messages: "मैसेज",
      branches: "ब्रांच",
      gymProfile: "जिम प्रोफाइल",
      activity: "गतिविधि",
    },
    liveWorkspace: "लाइव वर्कस्पेस",
    sampleData: "सैंपल डेटा",
    noOrgTitle: "कोई active gym नहीं मिला",
    noOrgDescription:
      "आपका sign-in active है, लेकिन इस account से अभी कोई gym जुड़ा नहीं है. Owner setup से gym profile बना सकते हैं.",
    startGym: "जिम शुरू करें",
    liveOrganization: "लाइव जिम",
    gymStatus: "जिम स्टेटस",
    branchScope: "ब्रांच",
    branchScopeMeta: "App इसी branch का check-in और plan data इस्तेमाल करता है.",
    attendanceMode: "अटेंडेंस मोड",
    trialRunway: "ट्रायल बाकी",
    primaryContact: "मुख्य संपर्क",
    todayAt: "आज",
    todayDescription: "Check-ins, members, payments, stock और follow-ups एक owner view में.",
    sectionDescription: "Gym का daily काम यहीं चलाएं. बदलाव Zook में अपने आप सेव होते हैं.",
    showQr: "QR दिखाएं",
    reports: "रिपोर्ट",
    needsAttention: "ध्यान देने वाली चीज़ें",
    needsAttentionDescription: "आज जिन कामों पर ध्यान चाहिए, उनके quick links.",
    showEntryQr: "Entry QR दिखाएं",
    reviewJoins: "Join requests देखें",
    checkStock: "Stock देखें",
    reviewActivity: "Activity देखें",
    scansToday: "आज scans",
    membershipRequests: "membership requests",
    lowStockItems: "low-stock items",
    activityEntries: "activity entries",
    location: "लोकेशन",
    locationMeta: "Current city",
    showingBranch: "Active branch का data दिख रहा है",
    joinMode: "Join mode",
    inboundRequests: "requests",
    checkInsToday: "आज check-ins",
    trialEnd: "Trial end",
  },
} as const;

type DashboardTranslation = (typeof dashboardTranslations)[keyof typeof dashboardTranslations];

function isHindi(locale?: string | null) {
  return locale === "hi";
}

function filterNavGroups(groups: typeof navGroups, permissions: Set<Permission>) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permissions ||
          item.permissions.some((permission) => permissions.has(permission)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function translatedGroupLabel(copy: DashboardTranslation, label: string) {
  return copy.navGroups[label as keyof typeof copy.navGroups] ?? label;
}

function translatedNavLabel(copy: DashboardTranslation, item: NavItem) {
  return copy.nav[item.key as keyof typeof copy.nav] ?? item.label;
}

function isActiveNav(href: string, sectionKey: string) {
  if (href === "/dashboard") {
    return sectionKey === "";
  }
  const hrefKey = href.replace("/dashboard/", "");
  return sectionKey === hrefKey || sectionKey.startsWith(`${hrefKey}/`);
}

function metricTone(label: string) {
  if (label.includes("Revenue") || label.includes("attendance")) {
    return "lime" as const;
  }
  if (label.includes("Low stock") || label.includes("queue") || label.includes("Trial")) {
    return "amber" as const;
  }
  if (label.includes("Assistant")) {
    return "blue" as const;
  }
  return "neutral" as const;
}

function prioritizeBranches(
  branches: DashboardData["branchScope"]["branches"],
  selectedBranchId?: string,
  limit = 4,
) {
  const priorityIds = new Set<string>();
  if (selectedBranchId) {
    priorityIds.add(selectedBranchId);
  }
  const defaultBranch = branches.find((branch) => branch.isDefault);
  if (defaultBranch) {
    priorityIds.add(defaultBranch.id);
  }

  const priorityBranches = branches.filter((branch) => priorityIds.has(branch.id));
  const remainingBranches = branches.filter((branch) => !priorityIds.has(branch.id));
  const visible = [...priorityBranches, ...remainingBranches].slice(0, limit);
  const visibleIds = new Set(visible.map((branch) => branch.id));

  return {
    visible,
    overflow: branches.filter((branch) => !visibleIds.has(branch.id)),
  };
}

function BranchSwitcher({
  branches,
  selectedBranchId,
  branchHref,
  compact = false,
}: {
  branches: DashboardData["branchScope"]["branches"];
  selectedBranchId: string | undefined;
  branchHref: (branchId: string) => string;
  compact?: boolean;
}) {
  const { visible, overflow } = prioritizeBranches(branches, selectedBranchId, compact ? 3 : 4);
  const linkClass = (branchId: string) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      selectedBranchId === branchId
        ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
        : "border-white/10 text-white/55 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((branch) => (
        <Link key={branch.id} href={branchHref(branch.id)} className={`${linkClass(branch.id)} shrink-0`}>
          {branch.name}
        </Link>
      ))}
      {overflow.length > 0 ? (
        <details className="group relative shrink-0">
          <summary className="cursor-pointer list-none rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/8 hover:text-white [&::-webkit-details-marker]:hidden">
            +{overflow.length} more
          </summary>
          <div className="absolute left-0 z-20 mt-2 grid max-h-64 min-w-60 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur">
            {overflow.map((branch) => (
              <Link key={branch.id} href={branchHref(branch.id)} className={`${linkClass(branch.id)} shrink-0`}>
                {branch.name}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function OwnerSetupChecklist({
  activeOrg,
  hasBranch,
  summary,
}: {
  activeOrg: DashboardData["orgs"][number];
  hasBranch: boolean;
  summary: DashboardData["summary"];
}) {
  const profileReady = activeOrg.status === "ACTIVE" && hasBranch && Boolean(activeOrg.city);
  const joinReady =
    summary.activeMembers > 0 || summary.joinRequests > 0 || summary.revenuePaise > 0;
  const checklist = [
    {
      label: "Complete gym profile",
      detail: "Publish your address, join mode, and gym profile page.",
      href: "/dashboard/public-profile",
      done: profileReady,
    },
    {
      label: "Create your first plan",
      detail: "Members need at least one offer before they can join.",
      href: "/dashboard/membership-plans",
      done: joinReady,
    },
    {
      label: "Invite your team",
      detail: "Add trainers, reception, and admins before peak-hour ops.",
      href: "/dashboard/staff",
      done: (summary.staffCount ?? 0) > 1,
    },
    {
      label: "Share your gym link",
      detail: "Open the gym profile page and copy the join link or QR.",
      href: "/dashboard/public-profile",
      done: summary.joinRequests > 0 || summary.activeMembers > 0,
    },
  ];
  const completed = checklist.filter((item) => item.done).length;

  return (
    <GlassCard variant="strong" className="overflow-hidden">
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr] xl:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-200/70">
            Owner setup
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Welcome to {activeOrg.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Finish these basics so members can join, staff can operate, and the gym link is ready to
            share.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ZookButtonLink
              href="/dashboard/membership-plans"
              size="md"
              trailingIcon={<ArrowRight size={16} />}
            >
              Create first plan
            </ZookButtonLink>
            <span className="text-sm text-white/45">
              {completed} of {checklist.length} complete
            </span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lime-300 transition-all duration-500"
              style={{ width: `${(completed / checklist.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {checklist.map((item) => {
            const Icon = item.done ? CheckCircle2 : Circle;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={20}
                    className={
                      item.done ? "mt-0.5 shrink-0 text-lime-200" : "mt-0.5 shrink-0 text-white/30"
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/48">{item.detail}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

export function DashboardShell({
  section,
  data,
  isPlatformAdmin,
  roles,
  permissions,
  user,
}: {
  section: string[] | undefined;
  data: DashboardData;
  isPlatformAdmin: boolean;
  roles: Role[];
  permissions?: Permission[];
  user: { name: string; email: string; preferredLocale?: string | null };
}) {
  const title = titleFromSection(section);
  const sectionKey = section?.join("/") ?? "";
  const activeOrg = data.orgs[0];
  const selectedBranch = data.branchScope.selectedBranch;
  const locale = isHindi(user.preferredLocale) ? "hi" : "en";
  const copy = dashboardTranslations[locale];
  const activePermissions = new Set<Permission>([
    ...permissionsForRoles(roles),
    ...(permissions ?? []),
  ]);
  const visibleNavGroups = filterNavGroups(navGroups, activePermissions);
  const canShowQr = activePermissions.has("ATTENDANCE_QR_DISPLAY");
  const canViewReports = activePermissions.has("ORG_VIEW_REPORTS");
  const runtimeLabel = data.connected
    ? copy.liveWorkspace
    : data.fallbackMode === "demo"
      ? copy.sampleData
      : "";

  if (!activeOrg) {
    return (
      <main className="min-h-screen px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-[1100px]">
          <GlassCard variant="strong">
            <EmptyState
              title={copy.noOrgTitle}
              description={copy.noOrgDescription}
            />
            <ZookButtonLink href="/start-gym" className="mt-5">
              {copy.startGym}
            </ZookButtonLink>
          </GlassCard>
        </div>
      </main>
    );
  }

  const workflowCards: Array<{
    label: string;
    href: string;
    detail: string;
    tone: PillTone;
  }> = [
    {
      label: copy.showEntryQr,
      href: "/dashboard/attendance/approvals",
      detail: `${data.summary.todayAttendance} ${copy.scansToday}`,
      tone: "lime",
    },
    {
      label: copy.reviewJoins,
      href: "/dashboard/members",
      detail: `${data.summary.joinRequests} ${copy.membershipRequests}`,
      tone: data.summary.joinRequests > 0 ? "amber" : "lime",
    },
    {
      label: copy.checkStock,
      href: "/dashboard/shop/products",
      detail: `${data.summary.lowStockProducts} ${copy.lowStockItems}`,
      tone: data.summary.lowStockProducts > 0 ? "amber" : "blue",
    },
    {
      label: copy.reviewActivity,
      href: "/dashboard/audit",
      detail: `${data.auditLogCount} ${copy.activityEntries}`,
      tone: data.auditLogCount > 0 ? "blue" : "neutral",
    },
  ];

  const pageTitle = sectionKey === "" ? `${copy.todayAt} ${activeOrg.name}` : title;
  const pageDescription =
    sectionKey === ""
      ? copy.todayDescription
      : copy.sectionDescription;
  const currentDashboardPath = `/dashboard${sectionKey ? `/${sectionKey}` : ""}`;
  const branchHref = (branchId: string) =>
    `${currentDashboardPath}?branchId=${encodeURIComponent(branchId)}`;
  const showOwnerSetupChecklist =
    sectionKey === "" &&
    (data.summary.activeMembers === 0 || !selectedBranch || activeOrg.status !== "ACTIVE");

  return (
    <main className="min-h-dvh overflow-x-hidden px-4 py-4 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] min-w-0 items-start gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="sticky top-4 hidden h-fit lg:block">
          <GlassCard variant="strong" className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4">
            <ZookLogo />
            <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                {copy.liveOrganization}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{activeOrg.name}</p>
              <p className="mt-1 text-sm text-white/48">
                {activeOrg.city}
                {activeOrg.state ? `, ${activeOrg.state}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill value={formatEnumLabel(activeOrg.status)} />
                <StatusPill value={joinModeLabel(activeOrg.joinMode)} tone="blue" />
                <StatusPill
                  value={formatBranchName(selectedBranch)}
                  tone={selectedBranch ? "lime" : "amber"}
                />
              </div>
            </div>

            <nav className="mt-6 grid gap-5">
              {visibleNavGroups.map((group) => (
                <div key={group.label} className="grid gap-1">
                  <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/30">
                    {translatedGroupLabel(copy, group.label)}
                  </p>
                  {group.items.map((item) => {
                    const { href, icon: Icon } = item;
                    const active = isActiveNav(href, sectionKey);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                            : "text-white/62 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <Icon size={18} />
                        {translatedNavLabel(copy, item)}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {isPlatformAdmin ? (
              <Link
                href="/platform"
                className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
              >
                <Shield size={18} />
                Platform admin
              </Link>
            ) : null}

            <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                {copy.gymStatus}
              </p>
              <ReadoutGrid
                className="mt-4"
                columns={1}
                items={[
                  {
                    label: copy.branchScope,
                    value: formatBranchName(selectedBranch),
                    meta: copy.branchScopeMeta,
                  },
                  {
                    label: copy.attendanceMode,
                    value: formatEnumLabel(activeOrg.attendanceMode),
                    meta: `${data.summary.todayAttendance} ${copy.checkInsToday}`,
                  },
                  {
                    label: copy.trialRunway,
                    value: formatDaysRemaining(data.summary.trialDaysRemaining),
                    meta: formatDate(activeOrg.trialEndAt),
                  },
                  {
                    label: copy.primaryContact,
                    value: activeOrg.contactEmail ?? activeOrg.contactPhone ?? "Desk-owned",
                    meta: copy.primaryContact,
                  },
                ]}
              />
            </div>
          </GlassCard>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          <div className="relative lg:hidden">
            <nav className="flex gap-3 overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 p-2 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleNavGroups.map((group) => (
                <div key={group.label} className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                    {translatedGroupLabel(copy, group.label)}
                  </span>
                  {group.items.map((item) => {
                    const { href, icon: Icon } = item;
                    const active = isActiveNav(href, sectionKey);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`zook-focus inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                          active ? "bg-lime-300 text-black" : "border border-white/10 text-white/70"
                        }`}
                      >
                        <Icon size={16} />
                        {translatedNavLabel(copy, item)}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 right-1 w-12 rounded-r-[22px] bg-gradient-to-l from-[#0a0d0a] to-transparent"
            />
          </div>

          <GlassCard variant="strong" className="min-w-0 overflow-hidden">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {runtimeLabel ? (
                    <Pill tone={data.connected ? "lime" : "amber"}>{runtimeLabel}</Pill>
                  ) : null}
                  <StatusPill value={formatEnumLabel(activeOrg.status)} />
                  <StatusPill value={joinModeLabel(activeOrg.joinMode)} tone="blue" />
                  <StatusPill
                    value={formatBranchName(selectedBranch)}
                    tone={selectedBranch ? "lime" : "amber"}
                  />
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{pageDescription}</p>
                {data.branchScope.branches.length > 1 ? (
                  <div className="mt-4">
                    <BranchSwitcher
                      branches={data.branchScope.branches}
                      selectedBranchId={selectedBranch?.id}
                      branchHref={branchHref}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-1 hidden text-right md:block">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/42">{user.email}</p>
                </div>
                {canShowQr ? (
                  <ZookButtonLink
                    href="/dashboard/attendance/qr-display"
                    leadingIcon={<QrCode size={18} />}
                  >
                    {copy.showQr}
                  </ZookButtonLink>
                ) : null}
                {canViewReports ? (
                  <ZookButtonLink href="/dashboard/reports" tone="secondary">
                    {copy.reports}
                  </ZookButtonLink>
                ) : null}
                <DashboardLocaleToggle locale={user.preferredLocale ?? undefined} />
                <DashboardSignOutButton compact />
              </div>
            </div>
          </GlassCard>

          {showOwnerSetupChecklist ? (
            <OwnerSetupChecklist
              activeOrg={activeOrg}
              hasBranch={Boolean(selectedBranch)}
              summary={data.summary}
            />
          ) : null}

          {sectionKey === "" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  delta={metric.delta}
                  tone={metricTone(metric.label)}
                />
              ))}
            </div>
          )}

          {sectionKey === "" && (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <GlassCard>
                <SectionHeader
                  eyebrow={copy.needsAttention}
                  title={copy.needsAttention}
                  description={copy.needsAttentionDescription}
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {workflowCards.map((card) => (
                    <Link
                      key={card.label}
                      href={card.href}
                      className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{card.label}</p>
                        <Pill tone={card.tone}>{card.detail}</Pill>
                      </div>
                    </Link>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <SectionHeader
                  eyebrow={copy.gymStatus}
                  title={copy.gymStatus}
                  description={copy.branchScopeMeta}
                />
                <ReadoutGrid
                  className="mt-5"
                  items={[
                    {
                      label: copy.location,
                      value: `${activeOrg.city}${activeOrg.state ? `, ${activeOrg.state}` : ""}`,
                      meta: copy.locationMeta,
                    },
                    {
                      label: copy.branchScope,
                      value: formatBranchName(selectedBranch),
                      meta: copy.showingBranch,
                    },
                    {
                      label: copy.joinMode,
                      value: joinModeLabel(activeOrg.joinMode),
                      meta: `${data.summary.joinRequests} ${copy.inboundRequests}`,
                    },
                    {
                      label: copy.attendanceMode,
                      value: formatEnumLabel(activeOrg.attendanceMode),
                      meta: `${data.summary.todayAttendance} ${copy.checkInsToday}`,
                    },
                    {
                      label: copy.trialEnd,
                      value: formatDate(activeOrg.trialEndAt),
                      meta: formatDaysRemaining(data.summary.trialDaysRemaining),
                    },
                  ]}
                  columns={2}
                />
              </GlassCard>
            </div>
          )}

          {sectionKey ? (
            <DashboardOperationalPanelShell
              orgId={activeOrg.id}
              sectionKey={sectionKey}
              organization={{
                id: activeOrg.id,
                name: activeOrg.name,
                city: activeOrg.city,
                state: activeOrg.state,
                status: activeOrg.status,
                joinMode: activeOrg.joinMode,
                attendanceMode: activeOrg.attendanceMode,
                trialEndAt: activeOrg.trialEndAt,
                contactEmail: activeOrg.contactEmail,
                contactPhone: activeOrg.contactPhone,
              }}
              summary={data.summary}
              branchScope={data.branchScope}
              auditLogCount={data.auditLogCount}
              initialJoinRequests={data.joinRequests}
              initialNotifications={data.notifications}
              initialProducts={data.products}
              initialAiUsage={data.aiUsage}
              roles={roles}
              permissions={[...activePermissions]}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
