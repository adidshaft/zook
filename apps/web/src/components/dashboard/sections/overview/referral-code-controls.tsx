import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  CouponRow,
  ReferralCodeRow,
  StaffUserRow,
} from "@/components/dashboard/types";
import { Select, TextInput } from "../../primitives";
import { ZookButton } from "../../../zook-button";
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
  const [showCreateForm, setShowCreateForm] = useState(referrals.length === 0);
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-white">Referral codes</p>
        {referrals.length ? (
          <ZookButton
            type="button"
            tone={showCreateForm ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? "Cancel" : "+ Code"}
          </ZookButton>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-white/45">
        Share a code or checkout link with a member. The referred member applies it during plan
        checkout; rewards are applied only after a successful redemption.
      </p>
      <div className="mt-3 grid gap-3">
        {showCreateForm ? (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <TextInput
                label="Referral code"
                value={referralForm.code}
                onChange={(event) =>
                  setReferralForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Optional custom code"
              />
              <Select
                label="Attached coupon"
                value={referralForm.couponId}
                onChange={(event) =>
                  setReferralForm((current) => ({ ...current, couponId: event.target.value }))
                }
                options={[
                  { value: "", label: "No coupon" },
                  ...coupons
                    .filter((coupon) => coupon.active)
                    .map((coupon) => ({ value: coupon.id, label: coupon.code })),
                ]}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <TextInput
                label="Max uses"
                value={referralForm.maxUses}
                onChange={(event) =>
                  setReferralForm((current) => ({ ...current, maxUses: event.target.value }))
                }
                placeholder="Max uses"
                inputMode="numeric"
              />
              <ZookButton
                type="button"
                onClick={() => void createReferral()}
                disabled={formBusy === "referral"}
                state={formBusy === "referral" ? "loading" : "idle"}
              >
                {formBusy === "referral" ? "Creating..." : "Create code"}
              </ZookButton>
            </div>
          </div>
        ) : null}
        {referrals.slice(0, 4).map((referral) => (
          <div
            key={referral.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-white">{referral.code}</p>
              <p className="text-xs text-white/45">
                {referralUsersById.get(referral.referrerUserId)?.email ?? referral.createdByRole} ·{" "}
                {referral.redemptionCount}/{referral.maxUses ?? "∞"} used · {referral.status}
              </p>
            </div>
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() =>
                void updateReferral(referral, referral.status === "active" ? "paused" : "active")
              }
              disabled={formBusy === `referral:${referral.id}`}
              state={formBusy === `referral:${referral.id}` ? "loading" : "idle"}
            >
              {referral.status === "active" ? "Pause" : "Restore"}
            </ZookButton>
          </div>
        ))}
      </div>
    </div>
  );
}
