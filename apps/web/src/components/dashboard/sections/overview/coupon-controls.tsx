import { useState, type Dispatch, type SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, CouponRow } from "@/components/dashboard/types";
import { EmptyState } from "../../../dashboard-primitives";
import { Select, TextInput } from "../../primitives";
import { ZookButton } from "../../../zook-button";
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
  const [showCreateForm, setShowCreateForm] = useState(coupons.length === 0);
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-white">Coupons</p>
        {coupons.length ? (
          <ZookButton
            type="button"
            tone={showCreateForm ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? "Cancel" : "+ Coupon"}
          </ZookButton>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3">
        {showCreateForm ? (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_150px]">
              <TextInput
                label="Coupon code"
                value={couponForm.code}
                onChange={(event) =>
                  setCouponForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WELCOME10"
              />
              <Select
                label="Discount type"
                value={couponForm.type}
                onChange={(event) =>
                  setCouponForm((current) => ({
                    ...current,
                    type: event.target.value as CouponKind,
                  }))
                }
                options={[
                  { value: "PERCENTAGE", label: "Percentage" },
                  { value: "FIXED_AMOUNT", label: "Fixed amount" },
                ]}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <TextInput
                label="Discount value"
                value={couponForm.value}
                onChange={(event) =>
                  setCouponForm((current) => ({ ...current, value: event.target.value }))
                }
                placeholder={couponForm.type === "PERCENTAGE" ? "10" : "500"}
                inputMode="numeric"
              />
              <TextInput
                label="Max uses"
                value={couponForm.maxRedemptions}
                onChange={(event) =>
                  setCouponForm((current) => ({
                    ...current,
                    maxRedemptions: event.target.value,
                  }))
                }
                placeholder="Max uses"
                inputMode="numeric"
              />
              <ZookButton
                type="button"
                onClick={() => void createCoupon()}
                disabled={formBusy === "coupon"}
                state={formBusy === "coupon" ? "loading" : "idle"}
                className="self-end"
              >
                {formBusy === "coupon" ? "Creating..." : "Create coupon"}
              </ZookButton>
            </div>
          </div>
        ) : null}
        {!coupons.length ? (
          <EmptyState
            title="No coupons"
            description="Create a code above to offer a controlled joining discount."
            className="border-white/10 bg-black/20"
          />
        ) : null}
        {coupons.slice(0, 4).map((coupon) => (
          <div key={coupon.id} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            {editingCouponId === coupon.id ? (
              <div className="grid gap-2">
                <TextInput
                  label="Coupon code"
                  value={couponEditForm.code}
                  onChange={(event) =>
                    setCouponEditForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <Select
                    label="Type"
                    value={couponEditForm.type}
                    onChange={(event) =>
                      setCouponEditForm((current) => ({
                        ...current,
                        type: event.target.value as CouponKind,
                      }))
                    }
                    options={[
                      { value: "PERCENTAGE", label: "Percentage" },
                      { value: "FIXED_AMOUNT", label: "Fixed" },
                    ]}
                  />
                  <TextInput
                    label="Value"
                    value={couponEditForm.value}
                    onChange={(event) =>
                      setCouponEditForm((current) => ({
                        ...current,
                        value: event.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <ZookButton
                    type="button"
                    size="sm"
                    onClick={() => void updateCoupon(coupon.id)}
                    disabled={formBusy === `coupon:${coupon.id}:edit`}
                    state={formBusy === `coupon:${coupon.id}:edit` ? "loading" : "idle"}
                  >
                    Save
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => setEditingCouponId(null)}
                  >
                    Cancel
                  </ZookButton>
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
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => startCouponEdit(coupon)}
                  >
                    Edit
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => void toggleCoupon(coupon)}
                    disabled={formBusy === `coupon:${coupon.id}`}
                    state={formBusy === `coupon:${coupon.id}` ? "loading" : "idle"}
                  >
                    {coupon.active ? "Deactivate" : "Restore"}
                  </ZookButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
