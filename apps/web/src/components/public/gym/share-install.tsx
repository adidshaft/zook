import Link from "next/link";
import { QrCode } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { ShareButton } from "@/components/share-button";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym } from "./types";

export function ShareInstall({
  org,
  locale,
}: {
  org: PublicGym;
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <GlassCard>
        <h2 className="text-2xl font-semibold text-white">{t("shareOrInstall")}</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">
          {t("shareInstallCopyPrefix")} {org.name}.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {org.appStoreUrl ? <StoreLink href={org.appStoreUrl} label={t("appStore")} /> : null}
          {org.playStoreUrl ? <StoreLink href={org.playStoreUrl} label={t("playStore")} /> : null}
          <a
            href={`/qr/${org.username}?target=join&download=1`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
          >
            <QrCode size={16} />
            {t("downloadQr")}
          </a>
          <ShareButton
            title={`${org.name} on Zook`}
            text={`Join ${org.name} in ${org.city} on Zook.`}
            path={`/g/${org.username}`}
            label={t("shareJoinLink")}
          />
        </div>
      </GlassCard>
    </section>
  );
}

function StoreLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72">
      {label}
    </a>
  );
}

export function ReferralCard({ org, locale }: { org: PublicGym; locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <GlassCard>
      <h2 className="text-2xl font-semibold text-white">{t("referral")}</h2>
      <p className="mt-3 text-sm leading-6 text-white/55">{t("referralCopy")}</p>
      <Link
        href={localizedPath(`/join/${org.username}`, locale, { ref: "" })}
        className="zook-focus mt-5 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
      >
        {t("shareJoinLink")}
      </Link>
    </GlassCard>
  );
}
