"use client";

import dynamic from "next/dynamic";
import { GlassCard } from "./glass-card";
import { SectionHeader, Skeleton } from "./dashboard-primitives";

export const DashboardOperationalPanelShell = dynamic(
  () =>
    import("./dashboard-operational-panel").then((module) => ({
      default: module.DashboardOperationalPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <GlassCard>
        <SectionHeader
          eyebrow="Loading"
          title="Loading section"
          description="Preparing this view."
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-[22px]" />
          <Skeleton className="h-28 rounded-[22px]" />
          <Skeleton className="h-44 rounded-[22px] md:col-span-2" />
        </div>
      </GlassCard>
    ),
  },
);
