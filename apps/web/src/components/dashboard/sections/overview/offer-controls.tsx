import type { Dispatch, SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, MembershipPlanRow, OfferRow } from "../../../dashboard-operational-model";
import type { OfferFormState } from "./types";

type OfferControlsProps = {
  offers: OfferRow[];
  membershipPlans: MembershipPlanRow[];
  offerForm: OfferFormState;
  setOfferForm: Dispatch<SetStateAction<OfferFormState>>;
  editingOfferId: string | null;
  setEditingOfferId: Dispatch<SetStateAction<string | null>>;
  offerEditForm: OfferFormState;
  setOfferEditForm: Dispatch<SetStateAction<OfferFormState>>;
  formBusy: string | null;
  createOffer: () => Promise<void>;
  updateOffer: (offerId: string) => Promise<void>;
  toggleOffer: (offer: OfferRow) => Promise<void>;
  startOfferEdit: (offer: OfferRow) => void;
};

export function OfferControls({
  offers,
  membershipPlans,
  offerForm,
  setOfferForm,
  editingOfferId,
  setEditingOfferId,
  offerEditForm,
  setOfferEditForm,
  formBusy,
  createOffer,
  updateOffer,
  toggleOffer,
  startOfferEdit,
}: OfferControlsProps) {
  return (
<div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
  <p className="font-medium text-white">Public offers</p>
  <div className="mt-3 grid gap-3">
    <input
      value={offerForm.name}
      onChange={(event) =>
        setOfferForm((current) => ({ ...current, name: event.target.value }))
      }
      placeholder="Summer special"
      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
    />
    <div className="grid gap-3 md:grid-cols-2">
      <select
        value={offerForm.discountType}
        onChange={(event) =>
          setOfferForm((current) => ({
            ...current,
            discountType: event.target.value as CouponKind,
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
      <input
        value={offerForm.discountValue}
        onChange={(event) =>
          setOfferForm((current) => ({
            ...current,
            discountValue: event.target.value,
          }))
        }
        placeholder={offerForm.discountType === "PERCENTAGE" ? "Bps" : "Rupees"}
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_92px]">
      <select
        value={offerForm.applicablePlanId}
        onChange={(event) =>
          setOfferForm((current) => ({
            ...current,
            applicablePlanId: event.target.value,
          }))
        }
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="" className="bg-black">
          All public plans
        </option>
        {membershipPlans.map((plan) => (
          <option key={plan.id} value={plan.id} className="bg-black">
            {plan.name}
          </option>
        ))}
      </select>
      <input
        value={offerForm.endsInDays}
        onChange={(event) =>
          setOfferForm((current) => ({ ...current, endsInDays: event.target.value }))
        }
        placeholder="Days"
        inputMode="numeric"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
    </div>
    <button
      onClick={() => void createOffer()}
      disabled={formBusy === "offer"}
      className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
    >
      {formBusy === "offer" ? "Creating..." : "Create offer"}
    </button>
    {offers.slice(0, 4).map((offer) => (
      <div
        key={offer.id}
        className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
      >
        {editingOfferId === offer.id ? (
          <div className="grid gap-2">
            <input
              value={offerEditForm.name}
              onChange={(event) =>
                setOfferEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
            />
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <select
                value={offerEditForm.discountType}
                onChange={(event) =>
                  setOfferEditForm((current) => ({
                    ...current,
                    discountType: event.target.value as CouponKind,
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
                value={offerEditForm.discountValue}
                onChange={(event) =>
                  setOfferEditForm((current) => ({
                    ...current,
                    discountValue: event.target.value,
                  }))
                }
                inputMode="numeric"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void updateOffer(offer.id)}
                disabled={formBusy === `offer:${offer.id}:edit`}
                className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingOfferId(null)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{offer.name}</p>
              <p className="text-xs text-white/45">
                {offer.discountType === "PERCENTAGE"
                  ? `${offer.discountValue / 100}% off`
                  : formatInr(offer.discountValue)}{" "}
                · {offer.redemptionCount} used
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => startOfferEdit(offer)}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65"
              >
                Edit
              </button>
              <button
                onClick={() => void toggleOffer(offer)}
                disabled={formBusy === `offer:${offer.id}`}
                className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
              >
                {offer.active ? "Deactivate" : "Restore"}
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
