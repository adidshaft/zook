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
  return (
    <GlassCard variant="strong" className="h-fit">
      <p className="text-sm text-white/45">{t("membershipPreview")}</p>
      <h2 className="mt-2 text-3xl font-semibold text-white">{priceSummary(plans, locale)}</h2>
      <p className="mt-3 text-sm leading-6 text-white/55">{t("choosePlanProfile")}</p>
      <div className="mx-auto mt-5 w-40 rounded-[24px] border border-white/10 bg-white p-3">
        <Image
          src={`/qr/${org.username}?target=join`}
          alt={`Join ${org.name} on Zook`}
          width={160}
          height={160}
          sizes="160px"
          className="aspect-square w-full rounded-[14px]"
          unoptimized
        />
      </div>
      <p className="mt-3 text-center text-xs text-white/45">{t("scanToJoin")}</p>
      {hasPublicPlans ? (
        <Link
          href="#plans"
          className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
        >
          {t("viewPlans")}
        </Link>
      ) : (
        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
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
      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-lime-200" size={22} />
          <p className="text-sm font-medium text-white">{t("securePayment")}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/50">{t("paymentActivation")}</p>
      </div>
    </GlassCard>
  );
}
