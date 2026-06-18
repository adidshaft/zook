import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { PublicGymActions } from "@/components/public-gym-actions";
import { priceSummary } from "@/lib/public-gym-profile";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym, PublicGymPlan } from "./types";

export function GymMembershipCard({
  org,
  plans,
  locale,
}: {
  org: PublicGym;
  plans: PublicGymPlan[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const hasPublicPlans = plans.length > 0;
  const qrAlt = locale === "hi" ? `${org.name} को Zook पर join करें` : `Join ${org.name} on Zook`;
  return (
    <GlassCard variant="strong" className="h-fit">
      <p className="text-sm text-[var(--text-tertiary)]">{t("membershipPreview")}</p>
      <h2 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{priceSummary(plans, locale)}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("choosePlanProfile")}</p>
      <div className="mx-auto mt-5 w-40 rounded-[24px] border border-[var(--border)] bg-white p-3">
        <Image
          src={`/qr/${org.username}?target=join`}
          alt={qrAlt}
          width={160}
          height={160}
          sizes="160px"
          className="aspect-square w-full rounded-[14px]"
          unoptimized
        />
      </div>
      <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">{t("scanToJoin")}</p>
      {hasPublicPlans ? (
        <Link
          href="#plans"
          className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-glow-accent)] transition hover:bg-[var(--accent-soft)]"
        >
          {t("viewPlans")}
        </Link>
      ) : (
        <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {priceSummary([], locale)}
        </div>
      )}
      <PublicGymActions
        username={org.username}
        appStoreUrl={org.appStoreUrl}
        playStoreUrl={org.playStoreUrl}
        openLabel={t("openInApp")}
        copyLabel={t("copyJoinLink")}
        copiedLabel={t("copied")}
      />
      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[var(--accent)]" size={22} />
          <p className="text-sm font-medium text-[var(--text-primary)]">{t("securePayment")}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{t("paymentActivation")}</p>
      </div>
    </GlassCard>
  );
}
