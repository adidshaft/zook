import Link from "next/link";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";

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
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Plan growth"
        title="Discounts, offers, and referrals"
        description="Keep member acquisition tools next to the plans they affect."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Coupons",
            href: "/dashboard/plans/coupons",
            detail: "Create joining discounts and usage limits.",
            badge: `${activeCouponCount} active`,
          },
          {
            label: "Offers",
            href: "/dashboard/plans/offers",
            detail: "Publish plan offers for a date window or campaign.",
            badge: `${activeOfferCount} active`,
          },
          {
            label: "Referrals",
            href: "/dashboard/plans/referrals",
            detail: "Reward member, trainer, and staff referrals.",
            badge: `${referralCodeCount} codes`,
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
