import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  IndianRupee,
  Package,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { AvatarInitials, StatusDot } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import type { DashboardCopy, DashboardData } from "./types";

type AttentionRow = {
  icon: typeof ClipboardList;
  title: string;
  subtitle: string;
  iconColor: string;
  bgColor: string;
  href: string;
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function DashboardStatCard({
  label,
  value,
  delta,
  href,
  action,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  href?: string;
  action?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative min-w-[180px] rounded-[20px] border border-white/10 bg-black/20 p-5">
      <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-lime-300/12 text-lime-300">
        {icon}
      </div>
      <p className="pr-12 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-4xl font-bold tabular-nums text-white">{value}</p>
      {href && action ? (
        <Link href={href} className="mt-3 inline-flex text-xs font-semibold text-lime-300 hover:underline">
          {action} →
        </Link>
      ) : delta ? (
        <p className="mt-3 text-xs text-lime-300">{delta}</p>
      ) : null}
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassCard variant="muted" className={`rounded-[24px] border-white/10 bg-black/20 p-5 ${className}`}>
      {children}
    </GlassCard>
  );
}

function RevenueChart({ revenuePaise }: { revenuePaise: number }) {
  const revenueRupees = Math.round(revenuePaise / 100);
  const values = [0, 0, 0, 0, 0, 0, revenueRupees];
  const max = Math.max(1, ...values);
  const scaled = values.map((value) => Math.max(0, Math.min(100, (value / max) * 100)));
  const latestScaled = scaled.at(-1) ?? 0;
  const points = scaled.map((value, index) => `${72 + index * 52},${190 - value * 1.45}`).join(" ");
  const area = `72,190 ${points} 384,190`;
  return (
    <svg viewBox="0 0 420 220" className="mt-5 h-56 w-full" role="img" aria-label="Today revenue snapshot">
      <defs>
        <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b9f455" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#b9f455" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[45, 90, 135, 180].map((y) => (
        <line key={y} x1="55" x2="395" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />
      ))}
      {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((value, index) => (
        <text key={`${value}-${index}`} x="14" y={46 + index * 36} fill="rgba(255,255,255,0.32)" fontSize="11">
          {value >= 1000 ? `${Math.round(value / 1000)}K` : Math.round(value)}
        </text>
      ))}
      <polygon points={area} fill="url(#revenue-area)" />
      <polyline points={points} fill="none" stroke="#b9f455" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {scaled.map((value, index) => (
        <circle key={`${value}-${index}`} cx={72 + index * 52} cy={190 - value * 1.45} r={index === 5 ? 7 : 4} fill="#b9f455" />
      ))}
      <rect x="292" y={Math.max(42, 190 - latestScaled * 1.45 - 14)} width="76" height="28" rx="8" fill="#b9f455" />
      <text x="303" y={Math.max(61, 190 - latestScaled * 1.45 + 5)} fill="#070908" fontSize="12" fontWeight="700">
        {formatInr(revenuePaise)}
      </text>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => (
        <text key={label} x={61 + index * 52} y="214" fill="rgba(255,255,255,0.55)" fontSize="12">
          {label}
        </text>
      ))}
    </svg>
  );
}

function Donut({ percentage }: { percentage: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, percentage)) / 100) * circumference;
  return (
    <div className="relative h-[140px] w-[140px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#b9f455"
          strokeLinecap="round"
          strokeWidth="12"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-bold tabular-nums text-white">{percentage}%</p>
          <p className="text-[10px] text-white/40">of monthly limit</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardOverview({
  data,
}: {
  activeOrg: DashboardData["orgs"][number];
  selectedBranch: DashboardData["branchScope"]["selectedBranch"];
  data: DashboardData;
  copy: DashboardCopy;
}) {
  const summary = data.summary;
  const revenue = formatInr(summary.revenuePaise);
  const aiQuota = 50;
  const aiUsagePercent = Math.min(100, Math.round((summary.aiUsageThisMonth / aiQuota) * 100));
  const attentionRows: AttentionRow[] = [
    {
      icon: ClipboardList,
      title: `${summary.joinRequests} pending join requests`,
      subtitle: "Approve to start onboarding",
      iconColor: "text-red-300",
      bgColor: "bg-red-300/14",
      href: "/dashboard/members?view=join-requests",
    },
    {
      icon: Package,
      title: `${summary.lowStockProducts} items running low`,
      subtitle: data.products.length
        ? data.products.slice(0, 2).map((product) => product.name).join(", ")
        : "Pickup inventory is healthy",
      iconColor: "text-amber-300",
      bgColor: "bg-amber-300/14",
      href: "/dashboard/shop",
    },
    {
      icon: CalendarClock,
      title: `${summary.expiringMemberships} memberships expiring soon`,
      subtitle: "Renewal window: next 7 days",
      iconColor: "text-lime-300",
      bgColor: "bg-lime-300/14",
      href: "/dashboard/members",
    },
    {
      icon: Dumbbell,
      title: `${summary.pendingAttendanceApprovals} attendance approvals pending`,
      subtitle: "Desk review queue",
      iconColor: "text-sky-300",
      bgColor: "bg-sky-300/14",
      href: "/dashboard/attendance",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <DashboardStatCard
          label="Active Members"
          value={summary.activeMembers}
          delta={data.connected ? "Live member total" : "↑ 18 vs yesterday"}
          icon={<Users size={18} />}
        />
        <DashboardStatCard
          label="Today's Check-ins"
          value={summary.todayAttendance}
          delta={data.connected ? "Server-recorded today" : "↑ 12 vs yesterday"}
          icon={<CheckCircle2 size={18} />}
        />
        <DashboardStatCard
          label="Revenue"
          value={revenue}
          delta={data.connected ? "Confirmed payments" : "↑ 15% vs yesterday"}
          icon={<IndianRupee size={18} />}
        />
        <DashboardStatCard
          label="Pending Join Requests"
          value={summary.joinRequests}
          href="/dashboard/members?view=join-requests"
          action="View & approve"
          icon={<UserPlus size={18} />}
        />
        <DashboardStatCard
          label="Low Stock"
          value={summary.lowStockProducts}
          href="/dashboard/shop"
          action="View items"
          icon={<Package size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Live Attendance Feed</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-0.5 text-xs font-bold text-lime-300">
              <StatusDot tone="lime" pulse /> TODAY
            </span>
          </div>
          <div className="mt-4">
            <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-3 py-3">
                <AvatarInitials name="Check ins" className="h-10 w-10 rounded-full border-lime-300/35 bg-lime-300/15 text-lime-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{summary.todayAttendance} check-ins recorded today</p>
                  <p className="text-xs text-white/45">Server-authoritative attendance count</p>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
            </div>
          </div>
          <Link href="/dashboard/attendance" className="mt-4 inline-flex text-xs font-semibold text-lime-300 hover:underline">
            View all attendance →
          </Link>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Needs Attention</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {attentionRows.map(({ icon: RowIcon, title, subtitle, iconColor, bgColor, href }) => {
              return (
                <Link
                  key={title}
                  href={href}
                  className="flex min-h-[60px] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition hover:border-lime-300/25"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${bgColor} ${iconColor}`}>
                    <RowIcon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{title}</span>
                    <span className="block truncate text-xs text-white/45">{subtitle}</span>
                  </span>
                  <ChevronRight size={16} className="text-white/30" />
                </Link>
              );
            })}
          </div>
          <Link href="/dashboard/reports" className="mt-4 inline-flex text-xs font-semibold text-lime-300 hover:underline">
            View all alerts →
          </Link>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Revenue Snapshot</h2>
            <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70">
              Today
            </span>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-white/45">Total Revenue</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">{revenue}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-lime-300">Live</p>
              <p className="text-xs text-white/40">today</p>
            </div>
          </div>
          <RevenueChart revenuePaise={summary.revenuePaise} />
          <Link href="/dashboard/reports" className="mt-2 inline-flex text-xs font-semibold text-lime-300 hover:underline">
            View full report →
          </Link>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-4">
          <h2 className="text-base font-semibold text-white">AI Usage</h2>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Donut percentage={aiUsagePercent} />
            <div className="grid flex-1 gap-2">
              {[
                ["AI usage events", `${summary.aiUsageThisMonth} / ${aiQuota}`],
                ["Recent logs", `${data.aiUsage.length}`],
                ["Provider state", data.connected ? "Connected" : "Demo"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                  <span className="text-xs text-white/45">{label}</span>
                  <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/dashboard/ai" className="mt-4 inline-flex text-xs font-semibold text-lime-300 hover:underline">
            View AI insights →
          </Link>
        </Panel>

        <Panel className="lg:col-span-5">
          <h2 className="text-base font-semibold text-white">Recent Staff Actions</h2>
          <div className="mt-4">
            <Link href="/dashboard/audit" className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-3 py-2">
                <AvatarInitials name="Audit" className="h-8 w-8 rounded-full" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    <strong>{summary.staffCount}</strong> staff roles · {data.auditLogCount} audit records
                  </span>
                  <span className="text-xs text-white/42">Open audit log for exact actions and timestamps</span>
                </span>
                <ChevronRight size={16} className="text-white/35" />
            </Link>
          </div>
          <Link href="/dashboard/audit" className="mt-4 inline-flex text-xs font-semibold text-lime-300 hover:underline">
            View all staff activity →
          </Link>
        </Panel>

        <Panel className="relative overflow-hidden lg:col-span-3">
          <Sparkles className="h-8 w-8 text-lime-300" aria-hidden="true" />
          <h2 className="mt-5 text-sm font-semibold text-lime-200">Zook AI Tip</h2>
          <p className="mt-3 text-xs leading-5 text-white/55">
            {summary.todayAttendance === 0
              ? "No check-ins recorded today yet. Use reminders only when the gym confirms the campaign."
              : `${summary.todayAttendance} members checked in today. Keep the desk queue clear before peak hours.`}
          </p>
          <Link href="/dashboard/members" className="zook-focus mt-6 inline-flex rounded-lg border border-white/14 px-4 py-2 text-xs font-semibold text-white transition hover:border-lime-300/30">
            View Members
          </Link>
          <div className="pointer-events-none absolute -bottom-16 -right-14 h-40 w-40 rounded-full border border-lime-300/15" />
        </Panel>
      </div>
    </div>
  );
}
