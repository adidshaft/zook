import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  Bell,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Dumbbell,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
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
    membership: t("myMembership"),
  });
  const productCards: Array<[LucideIcon, string, string]> = [
    [Users, t("owners"), t("ownersValue")],
    [Smartphone, t("members"), t("membersValue")],
    [Bell, t("staff"), t("staffValue")],
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
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <div className="flex items-center gap-2">
            <Link
              href={localizedPath("/", nextLocale)}
              className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              {t("languageSwitch")}
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

        <section className="grid min-h-[74vh] items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              {t("homeHeroTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/58">
              {t("homeHeroCopy")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            </div>
          </div>

          <div className="grid gap-4">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/45">{t("ownerDashboard")}</p>
                  <h2 className="mt-1 text-3xl font-semibold">{t("runOpsWeb")}</h2>
                </div>
                <QrCode className="text-lime-200" />
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <Store className="text-amber-100" />
                  <p className="mt-4 text-sm text-white/45">{t("sellMemberships")}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <QrCode className="text-lime-200" />
                  <p className="mt-4 text-sm text-white/45">{t("publishJoin")}</p>
                </div>
              </div>
            </GlassCard>
            <div className="grid gap-4 md:grid-cols-3">
              {productCards.map(([Icon, label, value]) => (
                <GlassCard key={String(label)}>
                  <Icon className="text-amber-100" />
                  <p className="mt-4 text-sm text-white/45">{String(label)}</p>
                  <p className="mt-1 font-semibold">{String(value)}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassCard variant="strong" className="p-6">
            <div className="flex items-center gap-3">
              <Users className="text-lime-200" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {t("forOwners")}
              </h2>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {ownerFeatures.map(([Icon, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70"
                >
                  <Icon size={18} className="shrink-0 text-lime-200" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <div id="for-members" className="scroll-mt-6">
            <GlassCard variant="strong" className="h-full p-6">
              <div className="flex items-center gap-3">
                <Smartphone className="text-amber-100" />
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {t("forMembers")}
                </h2>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {memberFeatures.map(([Icon, label]) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70"
                  >
                    <Icon size={18} className="shrink-0 text-amber-100" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/20 px-6 py-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/35">
            {t("indiaOps")}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-white/70">
            {t("indiaOpsCopy")}
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-lime-200/65">
              {t("socialProof")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {t("socialTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">{t("socialCopy")}</p>
          </div>
          <div className="grid gap-3">
            {proofPoints.map((point) => (
              <div
                key={point}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/68"
              >
                {point}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-black/20 px-6 py-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{t("memberApps")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">
              {t("memberAppsCopy")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {iosAppUrl ? (
              <a
                href={iosAppUrl}
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {t("downloadIos")}
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/65">
                {t("iosSoon")}
              </span>
            )}
            {androidAppUrl ? (
              <a
                href={androidAppUrl}
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {t("downloadAndroid")}
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/65">
                {t("androidSoon")}
              </span>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/42 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Zook. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {accountLink ? (
              <Link href={localizedPath(accountLink.href, locale)} className="transition hover:text-white">
                {accountLink.label}
              </Link>
            ) : (
              <Link href={localizedPath("/login", locale)} className="transition hover:text-white">
                {t("login")}
              </Link>
            )}
            <Link
              href={localizedPath("/start-gym", locale)}
              className="transition hover:text-white"
            >
              {t("startGym")}
            </Link>
            <Link href={localizedPath("/privacy", locale)} className="transition hover:text-white">
              {t("privacy")}
            </Link>
            <Link href={localizedPath("/terms", locale)} className="transition hover:text-white">
              {t("terms")}
            </Link>
            <a href="mailto:hello@zook.app" className="transition hover:text-white">
              {t("contact")}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
