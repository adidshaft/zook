import { useState, type Dispatch, type SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, MembershipPlanRow, OfferRow } from "@/components/dashboard/types";
import { Select, TextInput } from "../../primitives";
import { ZookButton } from "../../../zook-button";
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
  const [showCreateForm, setShowCreateForm] = useState(offers.length === 0);
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-white">Public offers</p>
        {offers.length ? (
          <ZookButton
            type="button"
            tone={showCreateForm ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? "Cancel" : "+ Offer"}
          </ZookButton>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3">
        {showCreateForm ? (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
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
                placeholder={offerForm.discountType === "PERCENTAGE" ? "15" : "750"}
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
            <ZookButton
              type="button"
              onClick={() => void createOffer()}
              disabled={formBusy === "offer"}
              state={formBusy === "offer" ? "loading" : "idle"}
            >
              {formBusy === "offer" ? "Creating..." : "Create offer"}
            </ZookButton>
          </div>
        ) : null}
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
                  <ZookButton
                    type="button"
                    size="sm"
                    onClick={() => void updateOffer(offer.id)}
                    disabled={formBusy === `offer:${offer.id}:edit`}
                    state={formBusy === `offer:${offer.id}:edit` ? "loading" : "idle"}
                  >
                    Save
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => setEditingOfferId(null)}
                  >
                    Cancel
                  </ZookButton>
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
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => startOfferEdit(offer)}
                  >
                    Edit
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => void toggleOffer(offer)}
                    disabled={formBusy === `offer:${offer.id}`}
                    state={formBusy === `offer:${offer.id}` ? "loading" : "idle"}
                  >
                    {offer.active ? "Deactivate" : "Restore"}
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
