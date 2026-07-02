import { useState, type Dispatch, type SetStateAction } from "react";
import { formatInr } from "@/lib/format";
import type { CouponKind, MembershipPlanRow, OfferRow } from "@/components/dashboard/types";
import { Select, TextInput } from "../../primitives";
import { ZookButton } from "../../../zook-button";
import { useT } from "@/lib/use-t";
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
  const t = useT("plans");
  const [showCreateForm, setShowCreateForm] = useState(offers.length === 0);
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-white">{t("publicOffers")}</p>
        {offers.length ? (
          <ZookButton
            type="button"
            tone={showCreateForm ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? t("cancel") : t("offerCta")}
          </ZookButton>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3">
        {showCreateForm ? (
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <TextInput
              label={t("offerName")}
              value={offerForm.name}
              onChange={(event) =>
                setOfferForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t("offerNamePlaceholder")}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label={t("discountType")}
                value={offerForm.discountType}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    discountType: event.target.value as CouponKind,
                  }))
                }
                options={[
                  { value: "PERCENTAGE", label: t("percentage") },
                  { value: "FIXED_AMOUNT", label: t("fixedAmount") },
                ]}
              />
              <TextInput
                label={t("discountValue")}
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
                label={t("plan")}
                value={offerForm.applicablePlanId}
                onChange={(event) =>
                  setOfferForm((current) => ({
                    ...current,
                    applicablePlanId: event.target.value,
                  }))
                }
                options={[
                  { value: "", label: t("allPublicPlans") },
                  ...membershipPlans.map((plan) => ({ value: plan.id, label: plan.name })),
                ]}
              />
              <TextInput
                label={t("endsIn")}
                value={offerForm.endsInDays}
                onChange={(event) =>
                  setOfferForm((current) => ({ ...current, endsInDays: event.target.value }))
                }
                placeholder={t("daysPlaceholder")}
                inputMode="numeric"
              />
            </div>
            <ZookButton
              type="button"
              onClick={() => void createOffer()}
              disabled={formBusy === "offer"}
              state={formBusy === "offer" ? "loading" : "idle"}
            >
              {formBusy === "offer" ? t("creating") : t("createOffer")}
            </ZookButton>
          </div>
        ) : null}
        {offers.slice(0, 4).map((offer) => (
          <div key={offer.id} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            {editingOfferId === offer.id ? (
              <div className="grid gap-2">
                <TextInput
                  label={t("offerName")}
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
                    label={t("type")}
                    value={offerEditForm.discountType}
                    onChange={(event) =>
                      setOfferEditForm((current) => ({
                        ...current,
                        discountType: event.target.value as CouponKind,
                      }))
                    }
                    options={[
                      { value: "PERCENTAGE", label: t("percentage") },
                      { value: "FIXED_AMOUNT", label: t("fixed") },
                    ]}
                  />
                  <TextInput
                    label={t("value")}
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
                    {t("save")}
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => setEditingOfferId(null)}
                  >
                    {t("cancel")}
                  </ZookButton>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{offer.name}</p>
                  <p className="text-xs text-white/45">
                    {offer.discountType === "PERCENTAGE"
                      ? t("percentOff", { value: offer.discountValue / 100 })
                      : formatInr(offer.discountValue)}{" "}
                    · {t("usedCount", { count: offer.redemptionCount })}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => startOfferEdit(offer)}
                  >
                    {t("edit")}
                  </ZookButton>
                  <ZookButton
                    type="button"
                    tone="ghost"
                    size="sm"
                    onClick={() => void toggleOffer(offer)}
                    disabled={formBusy === `offer:${offer.id}`}
                    state={formBusy === `offer:${offer.id}` ? "loading" : "idle"}
                  >
                    {offer.active ? t("deactivate") : t("restore")}
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
