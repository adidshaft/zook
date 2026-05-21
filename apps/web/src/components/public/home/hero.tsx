import { ArrowRight, ArrowUpRight, CheckCircle2, QrCode, Store, Zap } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { HeroRingOrnament, MiniSparkline } from "@/components/hero-ornaments";
import {
  Counter,
  MotionSurface,
  PointerSpotlight,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion-primitives";
import { ZookButtonLink } from "@/components/zook-button";
import { localizedPath, type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

export function HomeHero({ locale }: { locale: PublicLocale }) {
  const { t, pillars } = homeData(locale);
  return (
    <section className="relative grid gap-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
      <Reveal y={32}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-lime-200/70">
          <span className="h-px w-8 bg-lime-200/40" />
          {t("indiaOps")}
        </div>
        <h1 className="mt-6 max-w-3xl text-[clamp(3rem,8vw,6.8rem)] font-semibold leading-[0.95]">
          {t("homeHeroTitle").split(" ").map((word, i) => (
            <span key={i} className={word.toLowerCase().includes("zook") ? "text-lime-200" : ""}>
              {word}{" "}
            </span>
          ))}
        </h1>
        <p className="mt-7 max-w-xl text-[17px] leading-8 text-white/60">{t("homeHeroCopy")}</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <ZookButtonLink
            href={localizedPath("/start-gym", locale)}
            trailingIcon={<ArrowRight size={18} />}
          >
            {t("startGym")}
          </ZookButtonLink>
          <ZookButtonLink
            href={localizedPath("/gyms", locale)}
            tone="secondary"
            trailingIcon={<ArrowRight size={18} />}
          >
            {t("findGym")}
          </ZookButtonLink>
          <div className="flex items-center gap-2 pl-1 text-xs text-white/45">
            <CheckCircle2 size={14} className="text-lime-300" />
            {t("pilotReady")}
          </div>
        </div>
        <Stagger
          className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/8 bg-white/[0.02]"
          delay={0.25}
          gap={0.1}
        >
          {["roles", "record", "uptime"].map((label, index) => (
            <StaggerItem key={label} className="px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {index === 2 ? "24/7" : <Counter value={index === 0 ? 3 : 1} />}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>
      <Reveal y={32} delay={0.15} className="relative">
        <div aria-hidden className="absolute -inset-6 -z-10 rounded-[40px] border border-lime-200/10" />
        <HeroRingOrnament className="absolute -right-6 -top-12 z-0 hidden lg:block" />
        <GlassCard variant="strong" className="group relative overflow-hidden p-6">
          <PointerSpotlight className="hidden lg:block" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">{t("ownerDashboard")}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">{t("runOpsWeb")}</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10">
              <QrCode size={20} className="text-lime-200" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[{ icon: Store, copy: t("sellMemberships"), tone: "amber" }, { icon: QrCode, copy: t("publishJoin"), tone: "lime" }].map(({ icon: Icon, copy, tone }) => (
              <MotionSurface key={copy} className={`group rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors ${tone === "amber" ? "hover:border-amber-200/30" : "hover:border-lime-200/30"}`}>
                <div className="flex items-center justify-between">
                  <Icon size={18} className={tone === "amber" ? "text-amber-100" : "text-lime-200"} />
                  <ArrowUpRight size={14} className="text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="mt-6 text-[13px] leading-5 text-white/55">{copy}</p>
              </MotionSurface>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
            <Zap size={14} className="text-lime-300" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Today</span>
            <MiniSparkline values={[3, 6, 4, 7, 9, 8, 12, 10, 14, 11, 13, 16]} width={56} height={18} className="ml-1 hidden sm:block" />
            <div className="ml-auto flex items-center gap-4 text-[12px]">
              <span className="text-white/70"><span className="font-semibold text-white"><Counter value={42} /></span> check-ins</span>
              <span className="text-white/70"><span className="font-semibold text-lime-300"><Counter value={18400} prefix="₹" /></span> collected</span>
            </div>
          </div>
        </GlassCard>
        <Stagger className="mt-4 grid grid-cols-3 gap-3" delay={0.3}>
          {pillars.map(({ icon: Icon, label, value, tone }) => (
            <StaggerItem key={label}>
              <MotionSurface>
                <GlassCard className="p-4">
                  <Icon size={18} className={tone === "lime" ? "text-lime-200" : tone === "amber" ? "text-amber-100" : "text-sky-200"} />
                  <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
                  <p className="mt-1 text-[13px] font-medium leading-5 text-white/85">{value}</p>
                </GlassCard>
              </MotionSurface>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>
    </section>
  );
}
