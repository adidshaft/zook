import { DataTable, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";

export type PlatformImpersonationRow = {
  id: string;
  targetUserId: string;
  targetOrgId?: string | null;
  reason: string;
  startedAt: string | Date;
  expiresAt: string | Date;
  endedAt?: string | Date | null;
};

export function PlatformImpersonationsSection({
  impersonations,
  formatDateTime,
}: {
  impersonations: PlatformImpersonationRow[];
  formatDateTime: (value: string | Date) => string;
}) {
  return (
    <div id="impersonations" className="scroll-mt-5">
      <GlassCard>
        <SectionHeader
          eyebrow="Impersonations"
          title="Support access log"
          badge={<Pill>{impersonations.length} sessions</Pill>}
        />
        <div className="mt-5">
          <DataTable
            columns={[
              {
                id: "target",
                header: "Account",
                render: (session) => (
                  <div>
                    <p className="font-medium text-white">{session.targetUserId}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {session.targetOrgId ?? "No gym selected"}
                    </p>
                  </div>
                ),
              },
              {
                id: "reason",
                header: "Reason",
                render: (session) => session.reason,
              },
              {
                id: "started",
                header: "Started",
                render: (session) => formatDateTime(session.startedAt),
              },
              {
                id: "status",
                header: "Status",
                render: (session) => {
                  const expired = new Date(session.expiresAt).getTime() < Date.now();
                  return (
                    <StatusPill
                      value={session.endedAt ? "Ended" : expired ? "Expired" : "Active"}
                      tone={!session.endedAt && expired ? "amber" : "blue"}
                    />
                  );
                },
              },
            ]}
            rows={impersonations}
            rowKey={(session) => session.id}
            empty="No sessions."
          />
        </div>
      </GlassCard>
    </div>
  );
}
