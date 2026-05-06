import type { Metadata } from "next";
import { Activity, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { PublicNav } from "@/components/public-nav";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getStatusPayload } from "@/server/readiness";

export const metadata: Metadata = {
  title: "System status",
  description: "Current availability for Zook web, database, payments, push, AI, and storage.",
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

export default async function StatusPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const payload = await getStatusPayload();
  const components = Object.entries(payload.components);

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
        <PublicNav
          showLogin={false}
          languageHref={localizedPath("/status", nextLocale)}
          languageLabel={t("languageSwitch")}
          backHref={localizedPath("/", locale)}
          backLabel={t("home")}
        />

        <GlassCard variant="strong">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Pill tone={statusTone(payload.status)}>{t("statusLabel")}</Pill>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {formatEnumLabel(payload.status)}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
                {t("lastChecked")} {formatDateTime(payload.timestamp)}. {t("statusCopy")}
              </p>
            </div>
            <div className="flex min-h-16 min-w-16 items-center justify-center rounded-[24px] border border-white/10 bg-black/20">
              <Activity size={28} className="text-lime-200" aria-hidden="true" />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-2xl font-semibold text-white">{t("components")}</h2>
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
      </div>
    </main>
  );
}
