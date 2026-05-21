"use client";

import { ErrorNotice } from "../operational-shared";
import { Pill } from "../../glass-card";
import { Section } from "../primitives";
import { CouponControls } from "../sections/overview/coupon-controls";
import { OfferControls } from "../sections/overview/offer-controls";
import { RouteFeedback } from "./route-feedback";
import type { GrowthRouteProps } from "./types";

const copy = {
  couponsDescription:
    "Create codes, set limits, and pause discounts without changing membership plans.",
  offersDescription: "Publish gym offers for a plan, date window, or gym-wide promotion.",
};

export function CouponsRouteSection(props: GrowthRouteProps) {
  return (
    <Section
      eyebrow="Coupons"
      title="Coupons"
      description={copy.couponsDescription}
      badge={
        <Pill tone={props.coupons.filter((coupon) => coupon.active).length ? "lime" : "amber"}>
          {props.coupons.filter((coupon) => coupon.active).length} active
        </Pill>
      }
    >
      <div className="grid gap-4">
        {props.couponsState.error ? <ErrorNotice message={props.couponsState.error} /> : null}
        <CouponControls
          coupons={props.coupons}
          couponForm={props.couponForm}
          setCouponForm={props.setCouponForm}
          editingCouponId={props.editingCouponId}
          setEditingCouponId={props.setEditingCouponId}
          couponEditForm={props.couponEditForm}
          setCouponEditForm={props.setCouponEditForm}
          formBusy={props.formBusy}
          createCoupon={props.createCoupon}
          updateCoupon={props.updateCoupon}
          toggleCoupon={props.toggleCoupon}
          startCouponEdit={props.startCouponEdit}
        />
        <RouteFeedback error={props.formError} status={props.formStatus} />
      </div>
    </Section>
  );
}

export function OffersRouteSection(props: GrowthRouteProps) {
  return (
    <Section
      eyebrow="Offers"
      title="Public offers"
      description={copy.offersDescription}
      badge={
        <Pill tone={props.offers.filter((offer) => offer.active).length ? "lime" : "amber"}>
          {props.offers.filter((offer) => offer.active).length} live
        </Pill>
      }
    >
      <div className="grid gap-4">
        <OfferControls
          offers={props.offers}
          membershipPlans={props.membershipPlans}
          offerForm={props.offerForm}
          setOfferForm={props.setOfferForm}
          editingOfferId={props.editingOfferId}
          setEditingOfferId={props.setEditingOfferId}
          offerEditForm={props.offerEditForm}
          setOfferEditForm={props.setOfferEditForm}
          formBusy={props.formBusy}
          createOffer={props.createOffer}
          updateOffer={props.updateOffer}
          toggleOffer={props.toggleOffer}
          startOfferEdit={props.startOfferEdit}
        />
        <RouteFeedback error={props.formError} status={props.formStatus} />
      </div>
    </Section>
  );
}
