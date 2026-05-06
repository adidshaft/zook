import type { Dispatch, SetStateAction } from "react";
import type { CouponRow, ReferralCodeRow, StaffUserRow } from "../../../dashboard-operational-model";
import type { ReferralFormState } from "./types";

type ReferralCodeControlsProps = {
  coupons: CouponRow[];
  referrals: ReferralCodeRow[];
  referralUsersById: Map<string, StaffUserRow>;
  referralForm: ReferralFormState;
  setReferralForm: Dispatch<SetStateAction<ReferralFormState>>;
  formBusy: string | null;
  createReferral: () => Promise<void>;
  updateReferral: (referral: ReferralCodeRow, status: "active" | "paused") => Promise<void>;
};

export function ReferralCodeControls({
  coupons,
  referrals,
  referralUsersById,
  referralForm,
  setReferralForm,
  formBusy,
  createReferral,
  updateReferral,
}: ReferralCodeControlsProps) {
  return (
<div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
  <p className="font-medium text-white">Referral codes</p>
  <div className="mt-3 grid gap-3">
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <input
        value={referralForm.code}
        onChange={(event) =>
          setReferralForm((current) => ({
            ...current,
            code: event.target.value.toUpperCase(),
          }))
        }
        placeholder="Optional custom code"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <select
        value={referralForm.couponId}
        onChange={(event) =>
          setReferralForm((current) => ({ ...current, couponId: event.target.value }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="" className="bg-black">
          No coupon
        </option>
        {coupons
          .filter((coupon) => coupon.active)
          .map((coupon) => (
            <option key={coupon.id} value={coupon.id} className="bg-black">
              {coupon.code}
            </option>
          ))}
      </select>
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <input
        value={referralForm.maxUses}
        onChange={(event) =>
          setReferralForm((current) => ({ ...current, maxUses: event.target.value }))
        }
        placeholder="Max uses"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <button
        onClick={() => void createReferral()}
        disabled={formBusy === "referral"}
        className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {formBusy === "referral" ? "Creating..." : "Create code"}
      </button>
    </div>
    {referrals.slice(0, 4).map((referral) => (
      <div
        key={referral.id}
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
      >
        <div>
          <p className="text-sm font-medium text-white">{referral.code}</p>
          <p className="text-xs text-white/45">
            {referralUsersById.get(referral.referrerUserId)?.email ??
              referral.createdByRole}{" "}
            · {referral.redemptionCount}/{referral.maxUses ?? "∞"} used ·{" "}
            {referral.status}
          </p>
        </div>
        <button
          onClick={() =>
            void updateReferral(
              referral,
              referral.status === "active" ? "paused" : "active",
            )
          }
          disabled={formBusy === `referral:${referral.id}`}
          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
        >
          {referral.status === "active" ? "Pause" : "Restore"}
        </button>
      </div>
    ))}
  </div>
</div>
  );
}
