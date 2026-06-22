import { EmptyState } from "./dashboard-primitives";
import { GlassCard } from "./glass-card";
import { ZookButtonLink } from "./zook-button";
import { titleFromSection } from "@/lib/format";
import { dashboardMessages, isHindi } from "./dashboard/shell/copy";
import { DashboardHeader } from "./dashboard/shell/dashboard-header";
import { DashboardOverview } from "./dashboard/shell/dashboard-overview";
import { DashboardSidebar } from "./dashboard/shell/dashboard-sidebar";
import { MobileDashboardMenu } from "./dashboard/shell/mobile-dashboard-menu";
import { filterNavGroups, navGroups } from "./dashboard/shell/nav";
import { OwnerSetupChecklist } from "./dashboard/shell/owner-setup-checklist";
import { LayoutTransition } from "./layout-transition";
import type { DashboardData } from "./dashboard/shell/types";
import type { Permission, Role } from "@zook/core";
import type { ReactNode } from "react";

const sectionDescriptions: Record<"en" | "hi", Record<string, string>> = {
  en: {
    attendance: "Display the entry QR, review unusual check-ins, and keep front-desk attendance clean.",
    payments: "Record desk payments, generate receipts, and review settlement work.",
    "payments/refunds": "Start refunds, track their status, and see which payments can be refunded.",
    shop: "Manage products, photos, branch stock, low-stock alerts, and shop order handovers.",
    "shop/orders": "Track shop orders by payment and pickup status for the desk team.",
    reports: "Review performance, member movement, revenue, and daily signals.",
    billing: "Complete billing details before generating receipts and GST invoices.",
    members: "Approve joins, find members, and manage plan handoffs.",
    plans: "Create plans and open discounts, public offers, and referral tools from one place.",
    classes: "Schedule upcoming group sessions for a branch and keep capacity visible for the desk team.",
    "plans/coupons": "Create and pause joining discounts for public plan purchases.",
    "plans/offers": "Publish public offers for plans or short campaigns.",
    "plans/referrals": "Create referral codes and tune rewards for members, trainers, and staff.",
    staff: "Invite Admin, Reception, and Trainer users with the right gym access.",
    notifications: "Send member updates and choose the exact audience before sending.",
    "notifications/templates": "Keep reusable message drafts available for common gym updates.",
    "notifications/history": "Review delivery status and follow up on messages that need attention.",
    branches: "Manage locations, branch details, and the branch used for daily operations.",
    "public-profile": "Polish the gym page, photos, links, timings, and entry QR presentation.",
    audit: "Review important changes made by the team.",
    ai: "See which AI features are available now and which ones are still being prepared.",
    settings: "Control core gym settings, payments, and message controls.",
  },
  hi: {
    attendance: "एंट्री QR दिखाएं, असामान्य चेक-इन देखें, और फ्रंट डेस्क अटेंडेंस साफ रखें.",
    payments: "डेस्क पेमेंट रिकॉर्ड करें, रसीद बनाएं, और सेटलमेंट काम देखें.",
    "payments/refunds": "रिफंड शुरू करें, उनका स्टेटस देखें, और रिफंड योग्य पेमेंट पहचानें.",
    shop: "प्रोडक्ट, फोटो, ब्रांच स्टॉक, कम स्टॉक अलर्ट, और पिकअप हैंडओवर संभालें.",
    "shop/orders": "डेस्क टीम के लिए शॉप ऑर्डर को पेमेंट और पिकअप स्टेटस से ट्रैक करें.",
    reports: "परफॉर्मेंस, मेंबर मूवमेंट, रेवेन्यू, और दैनिक संकेत देखें.",
    billing: "रसीद और GST इनवॉइस बनाने से पहले बिलिंग डिटेल पूरी करें.",
    members: "जॉइन रिक्वेस्ट मंज़ूर करें, मेंबर खोजें, और प्लान हैंडऑफ संभालें.",
    plans: "प्लान बनाएं और डिस्काउंट, ऑफर, रेफरल टूल एक जगह से खोलें.",
    classes: "ब्रांच के लिए ग्रुप क्लास शेड्यूल करें और टीम को क्षमता साफ दिखाएं.",
    "plans/coupons": "पब्लिक प्लान खरीदारी के लिए जॉइनिंग डिस्काउंट बनाएं या रोकें.",
    "plans/offers": "प्लान या छोटे कैंपेन के लिए पब्लिक ऑफर प्रकाशित करें.",
    "plans/referrals": "मेंबर, ट्रेनर, और टीम के लिए रेफरल कोड और रिवॉर्ड संभालें.",
    staff: "Admin, Reception, और Trainer को सही जिम अनुमति के साथ बुलाएं.",
    notifications: "मेंबर अपडेट भेजें और भेजने से पहले सही समूह चुनें.",
    "notifications/templates": "आम जिम अपडेट के लिए तैयार मैसेज रखें.",
    "notifications/history": "मैसेज की स्थिति देखें और जिन पर ध्यान चाहिए उन पर काम करें.",
    branches: "लोकेशन, ब्रांच डिटेल, और रोज़ के काम वाली ब्रांच संभालें.",
    "public-profile": "जिम पेज, फोटो, लिंक, समय, और एंट्री QR को बेहतर करें.",
    audit: "टीम द्वारा किए गए जरूरी बदलाव देखें.",
    ai: "कौनसे AI फीचर उपलब्ध हैं और कौनसे तैयार हो रहे हैं देखें.",
    settings: "मुख्य जिम सेटिंग, पेमेंट, और मैसेज व्यवस्था संभालें.",
  },
};

export function DashboardShell({
  section,
  data,
  isPlatformAdmin,
  roles,
  permissions,
  user,
  children,
}: {
  section: string[] | undefined;
  data: DashboardData;
  isPlatformAdmin: boolean;
  roles: Role[];
  permissions?: Permission[];
  user: { id?: string; name: string; email: string; preferredLocale?: string | null };
  children?: ReactNode;
}) {
  const title = titleFromSection(section);
  const sectionKey = section?.join("/") ?? "";
  const activeOrg = data.orgs[0];
  const selectedBranch = data.branchScope.selectedBranch;
  const locale = isHindi(user.preferredLocale) ? "hi" : "en";
  const copy = dashboardMessages[locale];
  const activePermissions = new Set<Permission>(permissions ?? []);
  const visibleNavGroups = filterNavGroups(navGroups, activePermissions);
  const serializableNavGroups = visibleNavGroups.map((group) => ({
    key: group.key,
    items: group.items.map(({ key, label, href, shortLabel, badgeKey, indent }) => ({
      key,
      label,
      href,
      shortLabel,
      badgeKey,
      indent,
    })),
  }));
  const roleLabel = roles.includes("OWNER")
    ? "Owner"
    : roles.includes("ADMIN")
      ? "Admin"
      : roles.includes("RECEPTIONIST")
        ? "Reception"
        : roles.includes("TRAINER")
          ? "Trainer"
          : "Member";
  const runtimeLabel = data.connected
    ? copy.dashboard.liveWorkspace
    : data.fallbackMode === "demo"
      ? copy.dashboard.fallbackWorkspace
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

  const pageTitle = sectionKey === "" ? "Today’s Command Board" : title;
  const pageDescription =
    sectionKey === ""
      ? "Real-time overview of your gym operations."
      : sectionDescriptions[locale][sectionKey] ?? "";
  const currentDashboardPath = `/dashboard${sectionKey ? `/${sectionKey}` : ""}`;
  const branchHref = (branchId: string) =>
    `${currentDashboardPath}?branchId=${encodeURIComponent(branchId)}`;
  const showOwnerSetupChecklist =
    sectionKey === "" &&
    (data.summary.activeMembers === 0 || !selectedBranch || activeOrg.status !== "ACTIVE");

  return (
    <main className="zook-shell-bg min-h-dvh overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
      <div className="mx-auto grid w-full max-w-[1760px] min-w-0 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <DashboardSidebar
          data={data}
          visibleNavGroups={serializableNavGroups}
          sectionKey={sectionKey}
          isPlatformAdmin={isPlatformAdmin}
          copy={copy}
        />

        <section className="grid min-w-0 content-start gap-4">
          <MobileDashboardMenu
            visibleNavGroups={serializableNavGroups}
            sectionKey={sectionKey}
            copy={copy}
            activeOrgId={activeOrg.id}
            activeBranchId={data.branchScope.allBranches ? "all" : selectedBranch?.id}
          />

          <DashboardHeader
            activeOrg={activeOrg}
            selectedBranch={selectedBranch}
            data={data}
            branchHref={branchHref}
            runtimeLabel={runtimeLabel}
            user={user}
            roleLabel={roleLabel}
            copy={copy}
          />

          <LayoutTransition layoutKey={sectionKey}>
            <div className="px-1 pt-3 md:px-0">
              <h1 className="text-3xl font-black tracking-[-0.035em] text-[var(--text-primary)] md:text-4xl">
                {pageTitle}
              </h1>
              {pageDescription ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  {pageDescription}
                </p>
              ) : null}
            </div>

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

            {sectionKey ? children : null}
          </LayoutTransition>
        </section>
      </div>
    </main>
  );
}
