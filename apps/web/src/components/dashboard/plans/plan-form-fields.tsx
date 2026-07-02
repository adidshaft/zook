import type { Dispatch, SetStateAction } from "react";
import { SearchableSelect } from "../../ui";
import { type MembershipPlanType } from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";
import type { PlanFormState } from "./types";

const membershipPlanTypes: MembershipPlanType[] = [
  "HYBRID",
  "DURATION",
  "VISIT_PACK",
  "DATE_RANGE",
  "TRIAL",
];

type PlansT = ReturnType<typeof useT>;

export function planTypeLabel(type: string | null | undefined, t: PlansT) {
  if (type === "HYBRID") return t("typeHybrid");
  if (type === "DURATION") return t("typeDuration");
  if (type === "VISIT_PACK") return t("typeVisitPack");
  if (type === "DATE_RANGE") return t("typeDateRange");
  if (type === "TRIAL") return t("typeTrial");
  return t("typeMembership");
}

const planTypeDescription = (type: MembershipPlanType, t: PlansT) =>
  type === "HYBRID"
    ? t("shapeHybrid")
    : type === "DURATION"
      ? t("shapeDuration")
      : type === "VISIT_PACK"
        ? t("shapeVisitPack")
        : type === "DATE_RANGE"
          ? t("shapeDateRange")
        : t("shapeTrial");

const usesDurationDays = (type: MembershipPlanType) =>
  type === "HYBRID" || type === "DURATION" || type === "DATE_RANGE" || type === "TRIAL";

const usesVisitLimit = (type: MembershipPlanType) => type === "HYBRID" || type === "VISIT_PACK";

type PlanFormFieldsProps = {
  form: PlanFormState;
  setForm: Dispatch<SetStateAction<PlanFormState>>;
  showShapeHint?: boolean;
};

export function PlanFormFields({ form, setForm, showShapeHint = false }: PlanFormFieldsProps) {
  const t = useT("plans");
  const showDurationDays = usesDurationDays(form.type);
  const showVisitLimit = usesVisitLimit(form.type);
  const inputClass =
    "zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none";
  const labelClass = "grid gap-1.5 text-sm text-white/55";

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          {t("planName")}
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t("planNamePlaceholder")}
            maxLength={60}
            pattern="^(?!.*\\d{8,}).{1,60}$"
            title={t("planNameHelp")}
            className={inputClass}
          />
        </label>
        <SearchableSelect
          label={t("planShape")}
          value={form.type}
          onChange={(type) =>
            setForm((current) => ({
              ...current,
              type: type as MembershipPlanType,
              durationDays: usesDurationDays(type as MembershipPlanType)
                ? current.durationDays
                : "",
              visitLimit: usesVisitLimit(type as MembershipPlanType) ? current.visitLimit : "",
            }))
          }
          options={membershipPlanTypes.map((type) => ({
            value: type,
            label: planTypeLabel(type, t),
            description: showShapeHint ? planTypeDescription(type, t) : undefined,
          }))}
        />
        {showShapeHint ? (
          <p className="md:col-span-2 text-xs text-white/45">
            {t("shapeHint")}
          </p>
        ) : null}
        <label className={labelClass}>
          {t("price")}
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.priceRupees}
            onChange={(event) =>
              setForm((current) => ({ ...current, priceRupees: event.target.value }))
            }
            placeholder="2499"
            inputMode="decimal"
            className={inputClass}
          />
        </label>
        {showDurationDays ? (
          <label className={labelClass}>
            {t("durationDays")}
            <input
              type="number"
              min="1"
              step="1"
              value={form.durationDays}
              onChange={(event) =>
                setForm((current) => ({ ...current, durationDays: event.target.value }))
              }
              placeholder="30"
              inputMode="numeric"
              className={inputClass}
            />
          </label>
        ) : null}
        {showVisitLimit ? (
          <label className={labelClass}>
            {t("visitLimit")}
            <input
              type="number"
              min="1"
              step="1"
              value={form.visitLimit}
              onChange={(event) =>
                setForm((current) => ({ ...current, visitLimit: event.target.value }))
              }
              placeholder="12"
              inputMode="numeric"
              className={inputClass}
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/55">
          {t("public")}
          <input
            type="checkbox"
            checked={form.publicVisible}
            onChange={(event) =>
              setForm((current) => ({ ...current, publicVisible: event.target.checked }))
            }
            className="h-4 w-4 accent-lime-300"
          />
        </label>
      </div>
      <label className={labelClass}>
        {t("shortPublicDescription")}
        <input
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          placeholder={t("descriptionPlaceholder")}
          className={inputClass}
        />
      </label>
    </>
  );
}
