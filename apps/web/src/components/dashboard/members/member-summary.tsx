"use client";

import { AlertCircle, UserCheck, UserPlus, Users } from "lucide-react";
import { KPITile, SectionHero } from "../charts";
import type { JoinRequestRow, MemberRow } from "@/components/dashboard/types";

export function MemberSummary({
  members,
  joinRequests,
}: {
  members: MemberRow[];
  joinRequests: JoinRequestRow[];
}) {
  const activeCount = members.filter((member) => {
    const status = (member.activeSubscription?.status ?? "").toUpperCase();
    return status === "ACTIVE";
  }).length;
  const expiringCount = members.filter((member) => {
    const endsAt = member.activeSubscription?.endsAt;
    if (!endsAt) return false;
    const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;

  return (
    <>
      <SectionHero
        eyebrow="Members"
        title="Member roster"
        description="Manage joins, payments, plans, and personal records - all of one member, in one place."
        icon={Users}
        tone="sky"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
            {joinRequests.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)] px-3 py-1 text-xs font-medium text-[var(--feedback-danger)]">
                <UserPlus size={11} />
                {joinRequests.length} pending
              </span>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPITile
          label="Total members"
          value={members.length}
          icon={Users}
          tone="sky"
          caption="In your roster"
        />
        <KPITile
          label="Active"
          value={activeCount}
          icon={UserCheck}
          tone="sky"
          caption={`${
            members.length > 0 ? Math.round((activeCount / members.length) * 100) : 0
          }% of roster`}
        />
        <KPITile
          label="Join requests"
          value={joinRequests.length}
          icon={UserPlus}
          tone={joinRequests.length > 0 ? "amber" : "sky"}
          caption={joinRequests.length > 0 ? "Needs approval" : "Inbox clear"}
        />
        <KPITile
          label="Expiring soon"
          value={expiringCount}
          icon={AlertCircle}
          tone={expiringCount > 0 ? "rose" : "lime"}
          caption={expiringCount > 0 ? "In next 7 days" : "All current"}
        />
      </div>
    </>
  );
}
