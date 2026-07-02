import Link from "next/link";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { useT } from "@/lib/use-t";

type PlanGrowthLinksProps = {
  activeCouponCount: number;
  activeOfferCount: number;
  referralCodeCount: number;
};

export function PlanGrowthLinks({
  activeCouponCount,
  activeOfferCount,
  referralCodeCount,
}: PlanGrowthLinksProps) {
  const t = useT("plans");

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("planGrowth")}
        title={t("discountsOffersReferrals")}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            label: t("coupons"),
            href: "/dashboard/plans/coupons",
            detail: t("couponsDetail"),
            badge: t("activeCount", { count: activeCouponCount }),
          },
          {
            label: t("offers"),
            href: "/dashboard/plans/offers",
            detail: t("offersDetail"),
            badge: t("activeCount", { count: activeOfferCount }),
          },
          {
            label: t("referrals"),
            href: "/dashboard/plans/referrals",
            detail: t("referralsDetail"),
            badge: t("codesCount", { count: referralCodeCount }),
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="zook-focus rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-lime-300/35 hover:bg-lime-300/8"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{item.label}</p>
                <p className="mt-2 text-sm leading-5 text-white/50">{item.detail}</p>
              </div>
              <Pill>{item.badge}</Pill>
            </div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}
