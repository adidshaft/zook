import type { Dispatch, SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, MembershipPlanRow, OfferRow } from "../../../dashboard-operational-model";
import { HelpHint } from "../../../ui";
import { Select, TextInput } from "../../primitives";
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
      <p className="inline-flex items-center gap-2 font-medium text-white">
        Public offers
        <HelpHint label="Discount value" title="Discount value">
          Percentage uses basis points internally. Switch to fixed amount to enter rupees.
        </HelpHint>
      </p>
      <div className="mt-3 grid gap-3">
        <TextInput
          label="Offer name"
          value={offerForm.name}
          onChange={(event) =>
            setOfferForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Summer special"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Discount type"
            value={offerForm.discountType}
            onChange={(event) =>
              setOfferForm((current) => ({
                ...current,
                discountType: event.target.value as CouponKind,
              }))
            }
            options={[
              { value: "PERCENTAGE", label: "Percentage" },
              { value: "FIXED_AMOUNT", label: "Fixed amount" },
            ]}
          />
          <TextInput
            label="Discount value"
            value={offerForm.discountValue}
            onChange={(event) =>
              setOfferForm((current) => ({
                ...current,
                discountValue: event.target.value,
              }))
            }
            placeholder={offerForm.discountType === "PERCENTAGE" ? "% off" : "Rs off"}
            inputMode="numeric"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_92px]">
          <Select
            label="Plan"
            value={offerForm.applicablePlanId}
            onChange={(event) =>
              setOfferForm((current) => ({
                ...current,
                applicablePlanId: event.target.value,
              }))
            }
            options={[
              { value: "", label: "All public plans" },
              ...membershipPlans.map((plan) => ({ value: plan.id, label: plan.name })),
            ]}
          />
          <TextInput
            label="Ends in"
            value={offerForm.endsInDays}
            onChange={(event) =>
              setOfferForm((current) => ({ ...current, endsInDays: event.target.value }))
            }
            placeholder="Days"
            inputMode="numeric"
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
          <div key={offer.id} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            {editingOfferId === offer.id ? (
              <div className="grid gap-2">
                <TextInput
                  label="Offer name"
                  value={offerEditForm.name}
                  onChange={(event) =>
                    setOfferEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <Select
                    label="Type"
                    value={offerEditForm.discountType}
                    onChange={(event) =>
                      setOfferEditForm((current) => ({
                        ...current,
                        discountType: event.target.value as CouponKind,
                      }))
                    }
                    options={[
                      { value: "PERCENTAGE", label: "Percentage" },
                      { value: "FIXED_AMOUNT", label: "Fixed" },
                    ]}
                  />
                  <TextInput
                    label="Value"
                    value={offerEditForm.discountValue}
                    onChange={(event) =>
                      setOfferEditForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                    inputMode="numeric"
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
