import { ErrorNotice } from "../../operational-shared";
import { ReadoutGrid, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard, Pill } from "../../../glass-card";
import { formatCompactNumber } from "@/lib/format";
import type { DiscountType, RewardType } from "../../../dashboard-operational-model";
import { CouponControls } from "./coupon-controls";
import { OfferControls } from "./offer-controls";
import { ReferralCodeControls } from "./referral-code-controls";
import type { OverviewOperationalSectionProps } from "./types";

type ReferralDiscountControlsProps = Pick<
  OverviewOperationalSectionProps,
  | "referralPolicy"
  | "referralPolicyState"
  | "referralAnalytics"
  | "referralAnalyticsState"
  | "referralsState"
  | "couponsState"
  | "coupons"
  | "offers"
  | "referrals"
  | "referralUsersById"
  | "membershipPlans"
  | "couponForm"
  | "setCouponForm"
  | "editingCouponId"
  | "setEditingCouponId"
  | "couponEditForm"
  | "setCouponEditForm"
  | "offerForm"
  | "setOfferForm"
  | "editingOfferId"
  | "setEditingOfferId"
  | "offerEditForm"
  | "setOfferEditForm"
  | "referralForm"
  | "setReferralForm"
  | "policyForm"
  | "setPolicyForm"
  | "formBusy"
  | "formError"
  | "formStatus"
  | "createCoupon"
  | "updateCoupon"
  | "toggleCoupon"
  | "startCouponEdit"
  | "createOffer"
  | "updateOffer"
  | "toggleOffer"
  | "startOfferEdit"
  | "createReferral"
  | "updateReferral"
  | "saveReferralPolicy"
>;

export function ReferralDiscountControls({
  referralPolicy,
  referralPolicyState,
  referralAnalytics,
  referralAnalyticsState,
  referralsState,
  couponsState,
  coupons,
  offers,
  referrals,
  referralUsersById,
  membershipPlans,
  couponForm,
  setCouponForm,
  editingCouponId,
  setEditingCouponId,
  couponEditForm,
  setCouponEditForm,
  offerForm,
  setOfferForm,
  editingOfferId,
  setEditingOfferId,
  offerEditForm,
  setOfferEditForm,
  referralForm,
  setReferralForm,
  policyForm,
  setPolicyForm,
  formBusy,
  formError,
  formStatus,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  startCouponEdit,
  createOffer,
  updateOffer,
  toggleOffer,
  startOfferEdit,
  createReferral,
  updateReferral,
  saveReferralPolicy,
}: ReferralDiscountControlsProps) {
  return (
    <GlassCard>
<SectionHeader
  eyebrow="Growth"
  title="Referral and discount controls"
  description="Configure the referral economy, attach discounts, and pause codes without leaving the command center."
  badge={
    <Pill tone={referralPolicy?.enabled === false ? "amber" : "lime"}>
      {referralPolicy?.enabled === false ? "Paused" : "Enabled"}
    </Pill>
  }
/>
<div className="mt-5 grid gap-4">
  {referralPolicyState.error || couponsState.error || referralsState.error ? (
    <ErrorNotice
      message={
        referralPolicyState.error ?? couponsState.error ?? referralsState.error ?? ""
      }
    />
  ) : null}
  {referralAnalyticsState.error ? (
    <ErrorNotice message={referralAnalyticsState.error} />
  ) : null}
  <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
    <ReadoutGrid
      columns={2}
      items={[
        {
          label: "Active codes",
          value: formatCompactNumber(
            referralAnalytics?.summary.activeCodes ?? referrals.length,
          ),
          meta: "Available to members and staff",
        },
        {
          label: "Redemptions",
          value: formatCompactNumber(
            referralAnalytics?.summary.redemptionsThisMonth ?? 0,
          ),
          meta: "This month",
        },
        {
          label: "Reward credits",
          value: formatCompactNumber(
            referralAnalytics?.summary.rewardCreditsThisMonth ?? 0,
          ),
          meta: "Days or visits credited",
        },
        {
          label: "Applied rewards",
          value: formatCompactNumber(
            referralAnalytics?.summary.appliedRewardsThisMonth ?? 0,
          ),
          meta: "Completed this month",
        },
      ]}
    />
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <p className="font-medium text-white">Top referrers</p>
      <div className="mt-3 grid gap-2">
        {(referralAnalytics?.topReferrers ?? []).length ? (
          referralAnalytics!.topReferrers.map((item) => (
            <div
              key={item.code.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.code.code}</p>
                <p className="text-xs text-white/45">
                  {item.user?.email ?? item.code.createdByRole} ·{" "}
                  {item.code.redemptionCount} redemptions
                </p>
              </div>
              <StatusPill
                value={item.code.status}
                tone={item.code.status === "active" ? "lime" : "amber"}
              />
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/45">
            Referral performance appears here after the first member share.
          </p>
        )}
      </div>
    </div>
  </div>
  <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-medium text-white">Referral policy</p>
        <p className="mt-1 text-xs text-white/45">
          Cap discounts at 30% and choose what referrers earn.
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-white/60">
        Enabled
        <input
          type="checkbox"
          checked={policyForm.enabled}
          onChange={(event) =>
            setPolicyForm((current) => ({ ...current, enabled: event.target.checked }))
          }
          className="h-4 w-4 accent-lime-300"
        />
      </label>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <select
        value={policyForm.referrerRewardType}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            referrerRewardType: event.target.value as RewardType,
          }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="DAYS" className="bg-black">
          Reward days
        </option>
        <option value="VISITS" className="bg-black">
          Reward visits
        </option>
        <option value="NONE" className="bg-black">
          No reward
        </option>
      </select>
      <input
        value={policyForm.referrerRewardValue}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            referrerRewardValue: event.target.value,
          }))
        }
        placeholder="Reward value"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={policyForm.maxDiscountCapBps}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            maxDiscountCapBps: event.target.value,
          }))
        }
        placeholder="Max cap bps"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <select
        value={policyForm.referredDiscountType}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            referredDiscountType: event.target.value as DiscountType,
          }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="PERCENTAGE" className="bg-black">
          Friend percentage
        </option>
        <option value="FIXED" className="bg-black">
          Friend fixed
        </option>
        <option value="NONE" className="bg-black">
          No friend discount
        </option>
      </select>
      <input
        value={policyForm.referredDiscountValue}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            referredDiscountValue: event.target.value,
          }))
        }
        placeholder="Discount value"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={policyForm.maxReferralsPerMonth}
        onChange={(event) =>
          setPolicyForm((current) => ({
            ...current,
            maxReferralsPerMonth: event.target.value,
          }))
        }
        placeholder="Monthly referral limit"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
    </div>
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60">
        Trainer codes
        <input
          type="checkbox"
          checked={policyForm.trainerReferralEnabled}
          onChange={(event) =>
            setPolicyForm((current) => ({
              ...current,
              trainerReferralEnabled: event.target.checked,
            }))
          }
          className="h-4 w-4 accent-lime-300"
        />
      </label>
      <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60">
        Staff codes
        <input
          type="checkbox"
          checked={policyForm.staffReferralEnabled}
          onChange={(event) =>
            setPolicyForm((current) => ({
              ...current,
              staffReferralEnabled: event.target.checked,
            }))
          }
          className="h-4 w-4 accent-lime-300"
        />
      </label>
      <button
        onClick={() => void saveReferralPolicy()}
        disabled={formBusy === "referral-policy"}
        className="zook-focus ml-auto rounded-full bg-lime-300 px-5 py-2 text-xs font-semibold text-black disabled:opacity-60"
      >
        {formBusy === "referral-policy" ? "Saving..." : "Save policy"}
      </button>
    </div>
  </div>

  <div className="grid gap-4 xl:grid-cols-3">
              <CouponControls
                coupons={coupons}
                couponForm={couponForm}
                setCouponForm={setCouponForm}
                editingCouponId={editingCouponId}
                setEditingCouponId={setEditingCouponId}
                couponEditForm={couponEditForm}
                setCouponEditForm={setCouponEditForm}
                formBusy={formBusy}
                createCoupon={createCoupon}
                updateCoupon={updateCoupon}
                toggleCoupon={toggleCoupon}
                startCouponEdit={startCouponEdit}
              />
              <OfferControls
                offers={offers}
                membershipPlans={membershipPlans}
                offerForm={offerForm}
                setOfferForm={setOfferForm}
                editingOfferId={editingOfferId}
                setEditingOfferId={setEditingOfferId}
                offerEditForm={offerEditForm}
                setOfferEditForm={setOfferEditForm}
                formBusy={formBusy}
                createOffer={createOffer}
                updateOffer={updateOffer}
                toggleOffer={toggleOffer}
                startOfferEdit={startOfferEdit}
              />
              <ReferralCodeControls
                coupons={coupons}
                referrals={referrals}
                referralUsersById={referralUsersById}
                referralForm={referralForm}
                setReferralForm={setReferralForm}
                formBusy={formBusy}
                createReferral={createReferral}
                updateReferral={updateReferral}
              />
            </div>
            {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
            {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
          </div>
    </GlassCard>
  );
}
