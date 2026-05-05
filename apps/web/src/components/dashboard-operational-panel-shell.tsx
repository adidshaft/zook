"use client";

import dynamic from "next/dynamic";
import { GlassCard } from "./glass-card";
import { SectionHeader } from "./dashboard-primitives";

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
      </GlassCard>
    ),
  },
);
