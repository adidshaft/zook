import { permissionsForRoles } from "@zook/core";
import { EmptyState } from "./dashboard-primitives";
import { GlassCard } from "./glass-card";
import { DashboardOperationalPanelShell } from "./dashboard-operational-panel-shell";
import { ZookButtonLink } from "./zook-button";
import { titleFromSection } from "@/lib/format";
import { dashboardMessages, isHindi } from "./dashboard/shell/copy";
import { DashboardHeader } from "./dashboard/shell/dashboard-header";
import { DashboardOverview } from "./dashboard/shell/dashboard-overview";
import { DashboardSidebar } from "./dashboard/shell/dashboard-sidebar";
import { MobileDashboardMenu } from "./dashboard/shell/mobile-dashboard-menu";
import { filterNavGroups, navGroups } from "./dashboard/shell/nav";
import { OwnerSetupChecklist } from "./dashboard/shell/owner-setup-checklist";
import type { DashboardData } from "./dashboard/shell/types";
import type { Permission, Role } from "@zook/core";

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
  const copy = dashboardMessages[locale];
  const activePermissions = new Set<Permission>([
    ...permissionsForRoles(roles),
    ...(permissions ?? []),
  ]);
  const hasMultipleBranches = data.branchScope.branches.length > 1;
  const visibleNavGroups = filterNavGroups(navGroups, activePermissions).map((group) => ({
    ...group,
    items: group.items.filter((item) => item.key !== "branches" || hasMultipleBranches),
  })).filter((group) => group.items.length > 0);
  const canShowQr = activePermissions.has("ATTENDANCE_QR_DISPLAY");
  const canViewReports = activePermissions.has("ORG_VIEW_REPORTS");
  const runtimeLabel = data.connected
    ? copy.dashboard.liveWorkspace
    : data.fallbackMode === "demo"
      ? copy.dashboard.sampleData
      : "";

  if (!activeOrg) {
    return (
      <main className="min-h-screen px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-[1100px]">
          <GlassCard variant="strong">
            <EmptyState
              title={copy.dashboard.emptyOrganization}
              description={copy.dashboard.emptyOrganizationDescription}
            />
            <ZookButtonLink href="/start-gym" className="mt-5">
              {copy.dashboard.startGym}
            </ZookButtonLink>
          </GlassCard>
        </div>
      </main>
    );
  }

  const pageTitle = sectionKey === "" ? `${copy.dashboard.todayAt} ${activeOrg.name}` : title;
  const pageDescription =
    sectionKey === ""
      ? copy.dashboard.todayDescription
      : copy.dashboard.sectionDescription;
  const currentDashboardPath = `/dashboard${sectionKey ? `/${sectionKey}` : ""}`;
  const branchHref = (branchId: string) =>
    `${currentDashboardPath}?branchId=${encodeURIComponent(branchId)}`;
  const showOwnerSetupChecklist =
    sectionKey === "" &&
    (data.summary.activeMembers === 0 || !selectedBranch || activeOrg.status !== "ACTIVE");

  return (
    <main className="min-h-dvh overflow-x-hidden px-4 py-4 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] min-w-0 items-start gap-4 lg:grid-cols-[300px_1fr]">
        <DashboardSidebar
          activeOrg={activeOrg}
          selectedBranch={selectedBranch}
          data={data}
          visibleNavGroups={visibleNavGroups}
          sectionKey={sectionKey}
          isPlatformAdmin={isPlatformAdmin}
          copy={copy}
        />

        <section className="grid min-w-0 content-start gap-4">
          <MobileDashboardMenu
            visibleNavGroups={visibleNavGroups}
            sectionKey={sectionKey}
            copy={copy}
          />

          <DashboardHeader
            activeOrg={activeOrg}
            selectedBranch={selectedBranch}
            data={data}
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            branchHref={branchHref}
            runtimeLabel={runtimeLabel}
            canShowQr={canShowQr}
            canViewReports={canViewReports}
            user={user}
            copy={copy}
          />

          {showOwnerSetupChecklist ? (
            <OwnerSetupChecklist
              activeOrg={activeOrg}
              hasBranch={Boolean(selectedBranch)}
              summary={data.summary}
              copy={copy}
            />
          ) : null}

          {sectionKey === "" ? (
            <DashboardOverview
              activeOrg={activeOrg}
              selectedBranch={selectedBranch}
              data={data}
              copy={copy}
            />
          ) : null}

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
