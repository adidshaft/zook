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
          title="Opening operational surface"
          description="The dashboard controls are loading in the browser."
        />
      </GlassCard>
    ),
  },
);
