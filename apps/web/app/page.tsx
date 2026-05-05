import Link from "next/link";
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
import { ZookLogo } from "@/components/zook-logo";

const iosAppUrl = process.env.NEXT_PUBLIC_IOS_APP_URL;
const androidAppUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL;

export default function HomePage() {
  const productCards: Array<[LucideIcon, string, string]> = [
    [Users, "Owners", "Plans, staff, shop, reports"],
    [Smartphone, "Members", "QR entry, plans, progress"],
    [Bell, "Staff", "Desk approvals and coaching"],
  ];
  const ownerFeatures: Array<[LucideIcon, string]> = [
    [ClipboardList, "Membership management"],
    [ShieldCheck, "Staff and trainer tools"],
    [ReceiptText, "Payment and invoicing"],
    [Users, "Referral programs"],
    [ShoppingBag, "Shop and inventory"],
    [ChartNoAxesColumnIncreasing, "Analytics and reports"],
  ];
  const memberFeatures: Array<[LucideIcon, string]> = [
    [QrCode, "QR check-in"],
    [Dumbbell, "Workout plans"],
    [Smartphone, "AI fitness assistant"],
    [ChartNoAxesColumnIncreasing, "Progress tracking"],
    [Store, "Shop and pickup"],
    [Bell, "Notifications"],
  ];
  const proofPoints = [
    "Owner setup stays on web, where plans, payments, staff, and reports are easier to review.",
    "Member workflows stay on mobile, so entry, workout plans, and progress live where members already check in.",
    "Desk and trainer workflows use the same operating record, reducing handoffs during busy hours.",
  ];

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <ZookLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/start-gym"
              className="hidden rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black sm:inline-flex"
            >
              Start your gym
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            >
              Login
            </Link>
          </div>
        </header>

        <section className="grid min-h-[74vh] items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              The operating system for modern gyms.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/58">
              Everything your gym needs: memberships, QR entry, trainer plans, desk operations, shop
              pickup, and owner reporting in one reliable workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/start-gym"
                className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                Start your gym
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/gyms"
                className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3 text-white/75 transition hover:bg-white/8 hover:text-white"
              >
                Find a gym
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/45">Owner dashboard</p>
                  <h2 className="mt-1 text-3xl font-semibold">Run gym operations from web.</h2>
                </div>
                <QrCode className="text-lime-200" />
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <Store className="text-amber-100" />
                  <p className="mt-4 text-sm text-white/45">Sell memberships and shop items</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <QrCode className="text-lime-200" />
                  <p className="mt-4 text-sm text-white/45">Publish join links and QR codes</p>
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
              <h2 className="text-2xl font-semibold tracking-tight text-white">For gym owners</h2>
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
                <h2 className="text-2xl font-semibold tracking-tight text-white">For members</h2>
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
            Built for India-first gym operations
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-white/70">
            Zook keeps owner setup on web and member daily workflows on mobile, so each role gets
            the surface that fits the job.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-lime-200/65">
              Social proof
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Built around the roles that keep a gym moving.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              The product evidence in this release comes from the live Zook workflows in the app:
              owners, members, trainers, and front desk staff all have dedicated paths.
            </p>
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
            <h2 className="text-2xl font-semibold tracking-tight text-white">Member apps</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">
              Mobile distribution badges will link to the live stores when the apps are published.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {iosAppUrl ? (
              <a
                href={iosAppUrl}
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Download on iOS
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/65">
                iOS app coming soon
              </span>
            )}
            {androidAppUrl ? (
              <a
                href={androidAppUrl}
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Get it on Android
              </a>
            ) : (
              <span className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white/65">
                Android app coming soon
              </span>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/42 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Zook. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="transition hover:text-white">
              Login
            </Link>
            <Link href="/start-gym" className="transition hover:text-white">
              Start your gym
            </Link>
            <a
              href="mailto:legal@zook.app?subject=Privacy%20policy"
              className="transition hover:text-white"
            >
              Privacy
            </a>
            <a
              href="mailto:legal@zook.app?subject=Terms%20of%20service"
              className="transition hover:text-white"
            >
              Terms
            </a>
            <a href="mailto:hello@zook.app" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
