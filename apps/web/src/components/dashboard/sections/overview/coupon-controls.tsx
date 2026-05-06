import type { Dispatch, SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, CouponRow } from "../../../dashboard-operational-model";
import type { CouponFormState } from "./types";

type CouponControlsProps = {
  coupons: CouponRow[];
  couponForm: CouponFormState;
  setCouponForm: Dispatch<SetStateAction<CouponFormState>>;
  editingCouponId: string | null;
  setEditingCouponId: Dispatch<SetStateAction<string | null>>;
  couponEditForm: CouponFormState;
  setCouponEditForm: Dispatch<SetStateAction<CouponFormState>>;
  formBusy: string | null;
  createCoupon: () => Promise<void>;
  updateCoupon: (couponId: string) => Promise<void>;
  toggleCoupon: (coupon: CouponRow) => Promise<void>;
  startCouponEdit: (coupon: CouponRow) => void;
};

export function CouponControls({
  coupons,
  couponForm,
  setCouponForm,
  editingCouponId,
  setEditingCouponId,
  couponEditForm,
  setCouponEditForm,
  formBusy,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  startCouponEdit,
}: CouponControlsProps) {
  return (
<div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
  <p className="font-medium text-white">Coupons</p>
  <div className="mt-3 grid gap-3">
    <div className="grid gap-3 md:grid-cols-[1fr_150px]">
      <input
        value={couponForm.code}
        onChange={(event) =>
          setCouponForm((current) => ({
            ...current,
            code: event.target.value.toUpperCase(),
          }))
        }
        placeholder="WELCOME10"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <select
        value={couponForm.type}
        onChange={(event) =>
          setCouponForm((current) => ({
            ...current,
            type: event.target.value as CouponKind,
          }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="PERCENTAGE" className="bg-black">
          Percentage
        </option>
        <option value="FIXED_AMOUNT" className="bg-black">
          Fixed amount
        </option>
      </select>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <input
        value={couponForm.value}
        onChange={(event) =>
          setCouponForm((current) => ({ ...current, value: event.target.value }))
        }
        placeholder={couponForm.type === "PERCENTAGE" ? "Bps, e.g. 1000" : "Rupees"}
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <input
        value={couponForm.maxRedemptions}
        onChange={(event) =>
          setCouponForm((current) => ({
            ...current,
            maxRedemptions: event.target.value,
          }))
        }
        placeholder="Max uses"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
      <button
        onClick={() => void createCoupon()}
        disabled={formBusy === "coupon"}
        className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {formBusy === "coupon" ? "Creating..." : "Create"}
      </button>
    </div>
    {coupons.slice(0, 4).map((coupon) => (
      <div
        key={coupon.id}
        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
      >
        {editingCouponId === coupon.id ? (
          <div className="grid gap-2">
            <input
              value={couponEditForm.code}
              onChange={(event) =>
                setCouponEditForm((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
            />
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <select
                value={couponEditForm.type}
                onChange={(event) =>
                  setCouponEditForm((current) => ({
                    ...current,
                    type: event.target.value as CouponKind,
                  }))
                }
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              >
                <option value="PERCENTAGE" className="bg-black">
                  Percentage
                </option>
                <option value="FIXED_AMOUNT" className="bg-black">
                  Fixed
                </option>
              </select>
              <input
                value={couponEditForm.value}
                onChange={(event) =>
                  setCouponEditForm((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
                inputMode="numeric"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void updateCoupon(coupon.id)}
                disabled={formBusy === `coupon:${coupon.id}:edit`}
                className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingCouponId(null)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{coupon.code}</p>
              <p className="text-xs text-white/45">
                {coupon.type === "PERCENTAGE"
                  ? `${(coupon.valuePercentBps ?? 0) / 100}% off`
                  : formatInr(coupon.valuePaise ?? 0)}{" "}
                · {coupon.active ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => startCouponEdit(coupon)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65"
              >
                Edit
              </button>
              <button
                onClick={() => void toggleCoupon(coupon)}
                disabled={formBusy === `coupon:${coupon.id}`}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
              >
                {coupon.active ? "Deactivate" : "Restore"}
              </button>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</div>
  );
}
