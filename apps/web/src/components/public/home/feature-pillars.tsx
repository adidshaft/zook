import { ArrowUpRight, Smartphone, Users } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

export function FeaturePillars({ locale }: { locale: PublicLocale }) {
  const { t, ownerFeatures, memberFeatures } = homeData(locale);
  return (
    <section className="grid gap-4 lg:grid-cols-2 text-[var(--text-primary)]">
      <Reveal>
        <GlassCard variant="strong" className="relative overflow-hidden p-7">
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent)_35%,transparent)] to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-accent-soft)]">
              <Users size={18} className="text-[var(--accent-strong)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("forOwners")}</h2>
          </div>
          <FeatureGrid items={ownerFeatures} />
        </GlassCard>
      </Reveal>
      <Reveal delay={0.15} id="for-members" className="scroll-mt-6">
        <GlassCard variant="strong" className="relative h-full overflow-hidden p-7">
          <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--feedback-warning)_30%,transparent)] to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-warning-soft)]">
              <Smartphone size={18} className="text-[var(--feedback-warning)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("forMembers")}</h2>
          </div>
          <FeatureGrid items={memberFeatures} />
        </GlassCard>
      </Reveal>
    </section>
  );
}

function FeatureGrid({ items }: { items: ReturnType<typeof homeData>["ownerFeatures"] }) {
  return (
    <Stagger className="mt-7 grid gap-2.5 sm:grid-cols-2" gap={0.05}>
      {items.map(([Icon, label]) => (
        <StaggerItem
          key={label}
          className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3.5 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
        >
          <Icon size={16} className="shrink-0 text-[var(--text-tertiary)] transition group-hover:text-[var(--text-secondary)]" />
          <span className="flex-1">{label}</span>
          <ArrowUpRight size={13} className="text-[var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
