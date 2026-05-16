import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { Counter, Float, Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { ZookButtonLink } from "@/components/zook-button";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { publicAccountLink } from "@/lib/auth-destinations";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

const iosAppUrl = process.env.NEXT_PUBLIC_IOS_APP_URL;
const androidAppUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const cookieStore = await cookies();
  const session = await resolveSessionSummaryFromToken(cookieStore.get(sessionCookieName)?.value);
  const accountLink = publicAccountLink(session, {
    dashboard: t("dashboard"),
    desk: t("desk"),
    coach: t("coach"),
    membership: t("myMembership"),
  });

  const pillars: Array<{ icon: LucideIcon; label: string; value: string; tone: string }> = [
    { icon: Users, label: t("owners"), value: t("ownersValue"), tone: "lime" },
    { icon: Smartphone, label: t("members"), value: t("membersValue"), tone: "amber" },
    { icon: Bell, label: t("staff"), value: t("staffValue"), tone: "sky" },
  ];
  const ownerFeatures: Array<[LucideIcon, string]> = [
    [ClipboardList, t("membershipManagement")],
    [ShieldCheck, t("staffTrainerTools")],
    [ReceiptText, t("paymentInvoicing")],
    [Users, t("referralPrograms")],
    [ShoppingBag, t("shopInventory")],
    [ChartNoAxesColumnIncreasing, t("analyticsReports")],
  ];
  const memberFeatures: Array<[LucideIcon, string]> = [
    [QrCode, t("qrCheckIn")],
    [Dumbbell, t("workoutPlans")],
    [Smartphone, t("fitnessAssistant")],
    [ChartNoAxesColumnIncreasing, t("progressTracking")],
    [Store, t("shopPickup")],
    [Bell, t("notifications")],
  ];
  const proofPoints = [t("proofOwnerWeb"), t("proofMemberMobile"), t("proofSharedRecord")];

  return (
    <main
      lang={locale === "hi" ? "hi-IN" : "en-IN"}
      className="relative min-h-screen overflow-x-hidden px-5 py-5"
    >
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <Float amplitude={18} duration={11} className="absolute -top-32 left-1/4">
          <div className="h-[520px] w-[520px] rounded-full bg-lime-300/[0.07] blur-[120px]" />
        </Float>
        <Float amplitude={14} duration={13} className="absolute top-[40%] -right-32">
          <div className="h-[480px] w-[480px] rounded-full bg-amber-200/[0.05] blur-[120px]" />
        </Float>
        <Float amplitude={20} duration={15} className="absolute bottom-[10%] left-[10%]">
          <div className="h-[420px] w-[420px] rounded-full bg-sky-300/[0.04] blur-[120px]" />
        </Float>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        {/* Nav */}
        <header className="sticky top-3 z-30 flex items-center justify-between rounded-full border border-white/8 bg-black/40 px-3 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-2 pl-2">
            <ZookLogo />
            <Pill tone="lime" className="hidden md:inline-flex">
              <Sparkles size={12} />
              {t("indiaOps")}
            </Pill>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={localizedPath("/", nextLocale)}
              className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/20 hover:text-white"
            >
              {t("languageSwitch")}
            </Link>
            <Link
              href={localizedPath("/gyms", locale)}
              className="hidden rounded-full px-3 py-1.5 text-xs text-white/65 transition hover:text-white sm:inline-flex"
            >
              {t("navGyms")}
            </Link>
            <ZookButtonLink
              href={localizedPath("/start-gym", locale)}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {t("startGym")}
            </ZookButtonLink>
            {accountLink ? (
              <ZookButtonLink href={localizedPath(accountLink.href, locale)} tone="ghost" size="sm">
                {accountLink.label}
              </ZookButtonLink>
            ) : (
              <ZookButtonLink href={localizedPath("/login", locale)} tone="ghost" size="sm">
                {t("login")}
              </ZookButtonLink>
            )}
          </div>
        </header>

        {/* HERO */}
        <section className="relative grid gap-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <Reveal y={32}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-lime-200/70">
              <span className="h-px w-8 bg-lime-200/40" />
              {t("indiaOps")}
            </div>
            <h1 className="mt-6 max-w-3xl text-[clamp(3rem,8vw,7rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
              {t("homeHeroTitle").split(" ").map((word, i) => (
                <span
                  key={i}
                  className={
                    word.toLowerCase().includes("operating") ||
                    word.toLowerCase().includes("modern")
                      ? "bg-gradient-to-br from-lime-200 to-lime-400 bg-clip-text text-transparent"
                      : ""
                  }
                >
                  {word}{" "}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-8 text-white/60">
              {t("homeHeroCopy")}
            </p>
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
                No card required
              </div>
            </div>

            {/* Stat strip */}
            <Stagger
              className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/8 bg-white/[0.02]"
              delay={0.25}
              gap={0.1}
            >
              <StaggerItem className="px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">roles</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  <Counter value={3} />
                </p>
              </StaggerItem>
              <StaggerItem className="px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">record</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  <Counter value={1} />
                </p>
              </StaggerItem>
              <StaggerItem className="px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">uptime</p>
                <p className="mt-1 text-2xl font-semibold text-white">24/7</p>
              </StaggerItem>
            </Stagger>
          </Reveal>

          {/* Visual: owner dashboard preview card stack */}
          <Reveal y={32} delay={0.15} className="relative">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[40px] bg-gradient-to-br from-lime-300/10 via-transparent to-transparent blur-2xl"
            />
            <GlassCard variant="strong" className="relative overflow-hidden p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                    {t("ownerDashboard")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
                    {t("runOpsWeb")}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10">
                  <QrCode size={20} className="text-lime-200" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="group rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-amber-200/30">
                  <div className="flex items-center justify-between">
                    <Store size={18} className="text-amber-100" />
                    <ArrowUpRight
                      size={14}
                      className="text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-100"
                    />
                  </div>
                  <p className="mt-6 text-[13px] leading-5 text-white/55">{t("sellMemberships")}</p>
                </div>
                <div className="group rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-lime-200/30">
                  <div className="flex items-center justify-between">
                    <QrCode size={18} className="text-lime-200" />
                    <ArrowUpRight
                      size={14}
                      className="text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime-200"
                    />
                  </div>
                  <p className="mt-6 text-[13px] leading-5 text-white/55">{t("publishJoin")}</p>
                </div>
              </div>

              {/* Mini KPI bar */}
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                <Zap size={14} className="text-lime-300" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Today</span>
                <div className="ml-auto flex items-center gap-4 text-[12px]">
                  <span className="text-white/70">
                    <span className="font-semibold text-white">
                      <Counter value={42} />
                    </span>{" "}
                    check-ins
                  </span>
                  <span className="text-white/70">
                    <span className="font-semibold text-lime-300">
                      <Counter value={18400} prefix="₹" />
                    </span>{" "}
                    collected
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Floating pillar tiles */}
            <Stagger className="mt-4 grid grid-cols-3 gap-3" delay={0.3}>
              {pillars.map(({ icon: Icon, label, value, tone }) => (
                <StaggerItem key={label}>
                <GlassCard className="p-4">
                  <Icon
                    size={18}
                    className={
                      tone === "lime"
                        ? "text-lime-200"
                        : tone === "amber"
                          ? "text-amber-100"
                          : "text-sky-200"
                    }
                  />
                  <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
                    {label}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-5 text-white/85">{value}</p>
                </GlassCard>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        </section>

        {/* PROOF STRIP */}
        <Reveal as="section" className="relative overflow-hidden rounded-[32px] border border-white/8 bg-black/30 px-8 py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-lime-200/30 to-transparent"
          />
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-200/70">
                {t("socialProof")}
              </p>
              <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.05] tracking-tight">
                {t("socialTitle")}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/55">{t("socialCopy")}</p>
            </div>
            <Stagger className="grid gap-3" gap={0.1}>
              {proofPoints.map((point, idx) => (
                <StaggerItem key={point}>
                  <div className="flex items-start gap-4 rounded-[20px] border border-white/8 bg-white/[0.025] p-4 text-sm leading-6 text-white/72 transition hover:border-lime-200/20 hover:bg-white/[0.04]">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-200/30 bg-lime-200/10 text-[11px] font-semibold text-lime-200">
                      0{idx + 1}
                    </span>
                    <span>{point}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        {/* FEATURE PILLARS */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Reveal>
          <GlassCard variant="strong" className="relative overflow-hidden p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-lime-300/8 blur-3xl"
            />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10">
                <Users size={18} className="text-lime-200" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {t("forOwners")}
              </h2>
            </div>
            <Stagger className="mt-7 grid gap-2.5 sm:grid-cols-2" gap={0.05}>
              {ownerFeatures.map(([Icon, label]) => (
                <StaggerItem
                  key={label}
                  className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3.5 text-sm text-white/72 transition hover:border-lime-200/25 hover:bg-lime-200/[0.04] hover:text-white"
                >
                  <Icon
                    size={16}
                    className="shrink-0 text-lime-200/80 transition group-hover:text-lime-200"
                  />
                  <span className="flex-1">{label}</span>
                  <ArrowUpRight
                    size={13}
                    className="text-white/15 transition group-hover:text-lime-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </GlassCard>
          </Reveal>

          <Reveal delay={0.15} id="for-members" className="scroll-mt-6">
            <GlassCard variant="strong" className="relative h-full overflow-hidden p-7">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-200/8 blur-3xl"
              />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-200/10">
                  <Smartphone size={18} className="text-amber-100" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {t("forMembers")}
                </h2>
              </div>
              <Stagger className="mt-7 grid gap-2.5 sm:grid-cols-2" gap={0.05}>
                {memberFeatures.map(([Icon, label]) => (
                  <StaggerItem
                    key={label}
                    className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3.5 text-sm text-white/72 transition hover:border-amber-200/25 hover:bg-amber-200/[0.04] hover:text-white"
                  >
                    <Icon
                      size={16}
                      className="shrink-0 text-amber-100/80 transition group-hover:text-amber-100"
                    />
                    <span className="flex-1">{label}</span>
                    <ArrowUpRight
                      size={13}
                      className="text-white/15 transition group-hover:text-amber-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </GlassCard>
          </Reveal>
        </section>

        {/* INDIA OPS BAND */}
        <Reveal as="section" className="relative overflow-hidden rounded-[32px] border border-white/8 bg-gradient-to-br from-lime-300/[0.06] via-transparent to-amber-200/[0.04] px-8 py-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
            {t("indiaOps")}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[clamp(1.1rem,2vw,1.5rem)] leading-[1.55] text-white/78">
            {t("indiaOpsCopy")}
          </p>
        </Reveal>

        {/* APP CTA */}
        <Reveal as="section" className="relative grid gap-5 overflow-hidden rounded-[32px] border border-white/8 bg-black/30 px-8 py-9 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <Pill tone="amber" className="mb-4">
              <Smartphone size={11} />
              {t("memberApps")}
            </Pill>
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("memberApps")}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">{t("memberAppsCopy")}</p>
          </div>
          <div className="flex flex-wrap justify-start gap-3 md:justify-end">
            {iosAppUrl ? (
              <a
                href={iosAppUrl}
                className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
              >
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                    Download on
                  </span>
                  <span>iOS App Store</span>
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-white/40 transition group-hover:text-white"
                />
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/55">
                {t("iosSoon")}
              </span>
            )}
            {androidAppUrl ? (
              <a
                href={androidAppUrl}
                className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
              >
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                    Get it on
                  </span>
                  <span>Google Play</span>
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-white/40 transition group-hover:text-white"
                />
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/55">
                {t("androidSoon")}
              </span>
            )}
          </div>
        </Reveal>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-white/10 py-7 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Zook. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {accountLink ? (
              <Link
                href={localizedPath(accountLink.href, locale)}
                className="transition hover:text-white"
              >
                {accountLink.label}
              </Link>
            ) : (
              <Link
                href={localizedPath("/login", locale)}
                className="transition hover:text-white"
              >
                {t("login")}
              </Link>
            )}
            <Link href={localizedPath("/start-gym", locale)} className="transition hover:text-white">
              {t("startGym")}
            </Link>
            <Link href={localizedPath("/privacy", locale)} className="transition hover:text-white">
              {t("privacy")}
            </Link>
            <Link href={localizedPath("/terms", locale)} className="transition hover:text-white">
              {t("terms")}
            </Link>
            <a href="mailto:support@zookfit.in" className="transition hover:text-white">
              {t("contact")}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
