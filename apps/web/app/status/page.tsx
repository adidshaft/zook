import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { PublicNav } from "@/components/public/nav/public-nav";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getStatusPayload } from "@/server/readiness";

export const metadata: Metadata = {
  title: "Zook status",
  description: "Current availability for Zook check-ins, payments, and app access.",
  alternates: { canonical: "/status" },
};

function statusTone(status: string) {
  if (status === "operational") {
    return "lime";
  }
  if (status === "down") {
    return "red";
  }
  return "amber";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "operational") {
    return <CheckCircle2 size={18} className="text-lime-200" aria-hidden="true" />;
  }
  if (status === "down") {
    return <CircleX size={18} className="text-red-200" aria-hidden="true" />;
  }
  return <CircleAlert size={18} className="text-amber-100" aria-hidden="true" />;
}

function aggregateServiceStatus(statuses: string[]) {
  if (statuses.some((status) => status === "down")) return "down";
  if (statuses.some((status) => status !== "operational")) return "degraded";
  return "operational";
}

function UptimeBars({ status }: { status: string }) {
  return (
    <div className="mt-5 flex h-8 items-end gap-1" aria-hidden="true">
      {Array.from({ length: 60 }).map((_, index) => (
        <span
          key={index}
          className={[
            "block flex-1 rounded-sm",
            status === "down"
              ? "bg-red-300/70"
              : status === "degraded"
                ? "bg-amber-200/70"
                : "bg-lime-300/70",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const locale = resolvePublicLocale(rawSearchParams);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const payload = await getStatusPayload();
  const components = Object.entries(payload.components);
  const engineeringParam = Array.isArray(rawSearchParams.engineering)
    ? rawSearchParams.engineering[0]
    : rawSearchParams.engineering;
  const engineeringMode = engineeringParam === "1";
  const userServices = [
    {
      key: "checkins",
      label: "Check-ins",
      detail: "Members can scan QR codes and desks can approve entries.",
      status: aggregateServiceStatus([
        payload.components.web.status,
        payload.components.db.status,
      ]),
    },
    {
      key: "payments",
      label: "Payments",
      detail: "Membership checkout and payment confirmations are available.",
      status: aggregateServiceStatus([
        payload.components.web.status,
        payload.components.db.status,
        payload.components.razorpay.status,
      ]),
    },
    {
      key: "app",
      label: "App & web",
      detail: "Member, trainer, reception, and owner screens are loading.",
      status: aggregateServiceStatus([
        payload.components.web.status,
        payload.components.db.status,
        payload.components.expo_push.status,
      ]),
    },
  ];
  const publicStatus = aggregateServiceStatus(userServices.map((service) => service.status));
  const statusHeadline =
    publicStatus === "operational"
      ? "All systems operational"
      : publicStatus === "down"
        ? "Some Zook services are down"
        : "Some Zook services are slower than usual";
  const degradedCount = userServices.filter((service) => service.status !== "operational").length;
  const uptimeLabel =
    publicStatus === "operational"
      ? "All systems operational"
      : `${degradedCount} service${degradedCount === 1 ? "" : "s"} in test-provider mode or degraded`;

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
        <PublicNav
          locale={locale}
          languageHref={localizedPath("/status", nextLocale)}
          languageLabel={t("languageSwitch")}
          backHref={localizedPath("/", locale)}
          backLabel={t("home")}
        />

        <GlassCard variant="strong">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Pill tone={statusTone(publicStatus)}>Zook · live status</Pill>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {statusHeadline}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
                {t("lastChecked")} {formatDateTime(payload.timestamp)}. Public status is grouped
                by the services gym teams care about.
              </p>
            </div>
            <div className="flex min-h-16 min-w-16 items-center justify-center rounded-[24px] border border-white/10 bg-black/20">
              <Activity size={28} className="text-lime-200" aria-hidden="true" />
            </div>
          </div>
        </GlassCard>

        <section className="grid gap-3 md:grid-cols-3">
          {userServices.map((service) => (
            <GlassCard key={service.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <StatusIcon status={service.status} />
                    {service.label}
                  </span>
                  <p className="mt-4 text-2xl font-semibold text-white">
                    {formatEnumLabel(service.status)}
                  </p>
                </div>
              </div>
              <UptimeBars status={service.status} />
              <p className="mt-4 text-sm leading-6 text-white/55">{service.detail}</p>
              <p className="mt-3 text-xs text-white/42">{uptimeLabel}</p>
            </GlassCard>
          ))}
        </section>

        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                Recent incidents · 90 days
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Incident history</h2>
            </div>
            <Pill tone={statusTone(publicStatus)}>{formatEnumLabel(publicStatus)}</Pill>
          </div>
          <p className="mt-5 text-sm text-white/50">
            Incident history will appear here once monitoring is active.
          </p>
          <p className="mt-5 text-sm text-white/50">
            Looking for engineering detail?{" "}
            <Link href="/status?engineering=1" className="text-white underline decoration-white/30">
              Switch to Engineering view
            </Link>
            .
          </p>
        </GlassCard>

        {engineeringMode ? (
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Engineering view</h2>
            <div className="mt-5 grid gap-3 md:hidden">
            {components.map(([key, component]) => (
              <div key={key} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{component.label}</p>
                    <p className="mt-2 text-sm text-white/55">{component.detail}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 text-sm text-white/72">
                    <StatusIcon status={component.status} />
                    {formatEnumLabel(component.status)}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">
                  {t("provider")}{" "}
                  <span className="ml-2 text-white/60">{component.provider ?? "Zook"}</span>
                </p>
              </div>
            ))}
            </div>
            <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-white/35">
                <tr>
                  <th scope="col" className="border-b border-white/10 pb-3 pr-4 font-semibold">
                    {t("component")}
                  </th>
                  <th scope="col" className="border-b border-white/10 px-4 pb-3 font-semibold">
                    {t("statusLabel")}
                  </th>
                  <th scope="col" className="border-b border-white/10 px-4 pb-3 font-semibold">
                    {t("provider")}
                  </th>
                  <th scope="col" className="border-b border-white/10 pl-4 pb-3 font-semibold">
                    {t("detail")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map(([key, component]) => (
                  <tr key={key} className="align-top text-white/72">
                    <th scope="row" className="border-b border-white/10 py-4 pr-4 font-medium text-white">
                      {component.label}
                    </th>
                    <td className="border-b border-white/10 px-4 py-4">
                      <span className="inline-flex items-center gap-2">
                        <StatusIcon status={component.status} />
                        {formatEnumLabel(component.status)}
                      </span>
                    </td>
                    <td className="border-b border-white/10 px-4 py-4 text-white/55">
                      {component.provider ?? "Zook"}
                    </td>
                    <td className="border-b border-white/10 py-4 pl-4 text-white/55">
                      {component.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </GlassCard>
        ) : null}
      </div>
    </main>
  );
}
