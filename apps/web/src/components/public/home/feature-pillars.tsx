import { ArrowUpRight, Smartphone, Users } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

export function FeaturePillars({ locale }: { locale: PublicLocale }) {
  const { t, ownerFeatures, memberFeatures } = homeData(locale);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Reveal>
        <GlassCard variant="strong" className="relative overflow-hidden p-7">
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lime-200/35 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10">
              <Users size={18} className="text-lime-200" />
            </div>
            <h2 className="text-2xl font-semibold text-white">{t("forOwners")}</h2>
          </div>
          <FeatureGrid items={ownerFeatures} tone="lime" />
        </GlassCard>
      </Reveal>
      <Reveal delay={0.15} id="for-members" className="scroll-mt-6">
        <GlassCard variant="strong" className="relative h-full overflow-hidden p-7">
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/30 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-200/10">
              <Smartphone size={18} className="text-amber-100" />
            </div>
            <h2 className="text-2xl font-semibold text-white">{t("forMembers")}</h2>
          </div>
          <FeatureGrid items={memberFeatures} tone="amber" />
        </GlassCard>
      </Reveal>
    </section>
  );
}

function FeatureGrid({
  items,
  tone,
}: {
  items: ReturnType<typeof homeData>["ownerFeatures"];
  tone: "lime" | "amber";
}) {
  const hoverClass =
    tone === "lime"
      ? "hover:border-lime-200/25 hover:bg-lime-200/[0.04]"
      : "hover:border-amber-200/25 hover:bg-amber-200/[0.04]";
  const iconClass = tone === "lime" ? "text-lime-200/80 group-hover:text-lime-200" : "text-amber-100/80 group-hover:text-amber-100";
  return (
    <Stagger className="mt-7 grid gap-2.5 sm:grid-cols-2" gap={0.05}>
      {items.map(([Icon, label]) => (
        <StaggerItem
          key={label}
          className={`group flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3.5 text-sm text-white/72 transition hover:text-white ${hoverClass}`}
        >
          <Icon size={16} className={`shrink-0 transition ${iconClass}`} />
          <span className="flex-1">{label}</span>
          <ArrowUpRight size={13} className="text-white/15 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
