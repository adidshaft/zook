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
import {
  Counter,
  MotionSurface,
  PointerSpotlight,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/motion-primitives";
import {
  GridBackdrop,
  HeroRingOrnament,
  MiniSparkline,
} from "@/components/hero-ornaments";
import { ZookButtonLink } from "@/components/zook-button";
import { ZookLogo } from "@/components/zook-logo";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import {
  accountDestinationLabel,
  destinationToHref,
  publicAccountDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
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
  const origins = getOrigins();
  const accountDestination = publicAccountDestination(session);
  const accountLabel = accountDestination
    ? accountDestinationLabel(accountDestination, {
        dashboard: t("dashboard"),
        desk: t("desk"),
        coach: t("coach"),
        membership: t("myMembership"),
      })
    : null;
  const accountHref = accountDestination
    ? destinationToHref(accountDestination, "public", origins)
    : null;
  const localizedAccountHref = accountHref?.startsWith("/")
    ? localizedPath(accountHref, locale)
    : accountHref;

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
  const operationsLoop: Array<{ icon: LucideIcon; label: string; copy: string; tone: string }> = [
    { icon: Users, label: t("loopJoin"), copy: t("loopJoinCopy"), tone: "lime" },
    { icon: QrCode, label: t("loopCheckIn"), copy: t("loopCheckInCopy"), tone: "amber" },
    { icon: Dumbbell, label: t("loopCoach"), copy: t("loopCoachCopy"), tone: "sky" },
    { icon: ChartNoAxesColumnIncreasing, label: t("loopGrow"), copy: t("loopGrowCopy"), tone: "lime" },
  ];

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
        <GridBackdrop className="opacity-90" />
        <div className="absolute inset-x-0 top-0 h-[680px] bg-[linear-gradient(180deg,rgba(185,244,85,0.08),rgba(185,244,85,0)_66%)]" />
        <div className="absolute left-0 top-24 h-px w-full bg-gradient-to-r from-transparent via-lime-200/18 to-transparent" />
        <div className="absolute bottom-[18%] left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-100/10 to-transparent" />
        <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
        <div className="absolute inset-y-0 right-[14%] w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        {/* Nav */}
        <header className="sticky top-3 z-30 flex items-center justify-between rounded-full border border-white/8 bg-black/40 px-3 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-2 pl-2">
            <ZookLogo />
            <div className="hidden md:block">
              <Pill tone="lime">
                <Sparkles size={12} />
                {t("indiaOps")}
              </Pill>
            </div>
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
            <div className="hidden sm:block">
              <ZookButtonLink href={localizedPath("/start-gym", locale)} size="sm">
                {t("startGym")}
              </ZookButtonLink>
            </div>
            {localizedAccountHref ? (
              <ZookButtonLink href={localizedAccountHref} tone="ghost" size="sm">
                {accountLabel}
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
            <h1 className="mt-6 max-w-3xl text-[clamp(3rem,8vw,6.8rem)] font-semibold leading-[0.95]">
              {t("homeHeroTitle").split(" ").map((word, i) => (
                <span
                  key={i}
                  className={
                    word.toLowerCase().includes("zook")
                      ? "text-lime-200"
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
                {t("pilotReady")}
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
              className="absolute -inset-6 -z-10 rounded-[40px] border border-lime-200/10"
            />
            <HeroRingOrnament className="absolute -right-6 -top-12 z-0 hidden lg:block" />
            <GlassCard variant="strong" className="group relative overflow-hidden p-6">
              <PointerSpotlight className="hidden lg:block" />
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
                <MotionSurface className="group rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors hover:border-amber-200/30">
                  <div className="flex items-center justify-between">
                    <Store size={18} className="text-amber-100" />
                    <ArrowUpRight
                      size={14}
                      className="text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-100"
                    />
                  </div>
                  <p className="mt-6 text-[13px] leading-5 text-white/55">{t("sellMemberships")}</p>
                </MotionSurface>
                <MotionSurface className="group rounded-2xl border border-white/10 bg-black/25 p-4 transition-colors hover:border-lime-200/30">
                  <div className="flex items-center justify-between">
                    <QrCode size={18} className="text-lime-200" />
                    <ArrowUpRight
                      size={14}
                      className="text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime-200"
                    />
                  </div>
                  <p className="mt-6 text-[13px] leading-5 text-white/55">{t("publishJoin")}</p>
                </MotionSurface>
              </div>

              {/* Mini KPI bar */}
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                <Zap size={14} className="text-lime-300" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Today</span>
                <MiniSparkline
                  values={[3, 6, 4, 7, 9, 8, 12, 10, 14, 11, 13, 16]}
                  width={56}
                  height={18}
                  className="ml-1 hidden sm:block"
                />
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
                  <MotionSurface>
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
                  </MotionSurface>
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
              <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.05]">
                {t("socialTitle")}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/55">{t("socialCopy")}</p>
            </div>
            <Stagger className="grid gap-3" gap={0.1}>
              {proofPoints.map((point, idx) => (
                <StaggerItem key={point}>
                  <MotionSurface className="flex items-start gap-4 rounded-[20px] border border-white/8 bg-white/[0.025] p-4 text-sm leading-6 text-white/72 transition-colors hover:border-lime-200/20 hover:bg-white/[0.04]">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-200/30 bg-lime-200/10 text-[11px] font-semibold text-lime-200">
                      0{idx + 1}
                    </span>
                    <span>{point}</span>
                  </MotionSurface>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        {/* OPERATING LOOP */}
        <Reveal as="section" className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="rounded-[32px] border border-white/8 bg-black/28 p-7">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-200/70">
              {t("opsLoopLabel")}
            </p>
            <h2 className="mt-4 text-[clamp(1.7rem,3.2vw,2.45rem)] font-semibold leading-[1.08] text-white">
              {t("opsLoopTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/56">{t("opsLoopCopy")}</p>
          </div>
          <Stagger className="grid gap-3 sm:grid-cols-2" gap={0.06}>
            {operationsLoop.map(({ icon: Icon, label, copy, tone }) => (
              <StaggerItem key={label}>
                <MotionSurface className="h-full rounded-[24px] border border-white/8 bg-white/[0.025] p-5 transition-colors hover:border-white/18 hover:bg-white/[0.04]">
                  <div
                    className={
                      tone === "amber"
                        ? "flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-200/10 text-amber-100"
                        : tone === "sky"
                          ? "flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-200/25 bg-sky-200/10 text-sky-100"
                          : "flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10 text-lime-200"
                    }
                  >
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/56">{copy}</p>
                </MotionSurface>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        {/* FEATURE PILLARS */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Reveal>
          <GlassCard variant="strong" className="relative overflow-hidden p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lime-200/35 to-transparent"
            />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-200/30 bg-lime-200/10">
                <Users size={18} className="text-lime-200" />
              </div>
              <h2 className="text-2xl font-semibold text-white">
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
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/30 to-transparent"
              />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-200/10">
                  <Smartphone size={18} className="text-amber-100" />
                </div>
                <h2 className="text-2xl font-semibold text-white">
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
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
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
            {localizedAccountHref ? (
              <Link
                href={localizedAccountHref}
                className="transition hover:text-white"
              >
                {accountLabel}
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
