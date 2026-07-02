import { ReadoutGrid, SectionHeader, StatusPill } from "../dashboard-primitives";
import { GlassCard, Pill } from "../glass-card";

export type PlatformCockpitItem = {
  label: string;
  value: string;
  meta: string;
  tone?: "neutral" | "amber" | "blue" | "red" | "lime";
};

export function PlatformHealthCockpit({
  show,
  items,
  misconfiguredProviderCount,
  organizationCount,
  trialRiskCount,
  openFlagCount,
}: {
  show: boolean;
  items: PlatformCockpitItem[];
  misconfiguredProviderCount: number;
  organizationCount: number;
  trialRiskCount: number;
  openFlagCount: number;
}) {
  if (!show) return null;

  const cards = [
    {
      title: "Service alerts",
      body: misconfiguredProviderCount
        ? `${misconfiguredProviderCount} service${misconfiguredProviderCount === 1 ? "" : "s"} need review before launch.`
        : "Core services are not reporting issues.",
      tone: misconfiguredProviderCount ? "amber" : "neutral",
    },
    {
      title: "Gym activation",
      body: `${organizationCount} gym account${organizationCount === 1 ? "" : "s"} visible. ${trialRiskCount} active trial${trialRiskCount === 1 ? "" : "s"} need renewal follow-up.`,
      tone: trialRiskCount ? "amber" : "blue",
    },
    {
      title: "Safety queue",
      body: openFlagCount ? "Review open reports before inviting more gyms." : "No unresolved safety reports.",
      tone: openFlagCount ? "amber" : "neutral",
    },
  ] as const;

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Command"
        title="Platform health cockpit"
        badge={
          <Pill tone={misconfiguredProviderCount || openFlagCount ? "amber" : "neutral"}>
            {misconfiguredProviderCount || openFlagCount ? "Review needed" : "Healthy"}
          </Pill>
        }
      />
      <ReadoutGrid className="mt-5" items={items} columns={4} />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {cards.map((item) => (
          <div key={item.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <StatusPill value={item.title} tone={item.tone} />
            <p className="mt-3 text-sm leading-6 text-white/58">{item.body}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
