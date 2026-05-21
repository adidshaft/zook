import { Star } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export function GymReviews({ locale }: { locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <section>
      <GlassCard>
        <div className="flex items-center gap-3">
          <Star className="text-[var(--feedback-warning)] fill-[var(--feedback-warning)]" size={22} />
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("reviews")}</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("reviewsPending")}</p>
      </GlassCard>
    </section>
  );
}
