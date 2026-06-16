import type { Dispatch, SetStateAction } from "react";
import { HelpHint, SearchableSelect } from "../../ui";
import type { MembershipPlanType } from "@/components/dashboard/types";
import { formatEnumLabel } from "@/lib/format";
import type { PlanFormState } from "./types";

const membershipPlanTypes: MembershipPlanType[] = [
  "HYBRID",
  "DURATION",
  "VISIT_PACK",
  "DATE_RANGE",
  "TRIAL",
];

const planTypeDescription = (type: MembershipPlanType) =>
  type === "HYBRID"
    ? "Days or visits, whichever comes first."
    : type === "DURATION"
      ? "Days only."
      : type === "VISIT_PACK"
        ? "Visits only, no expiry."
        : type === "DATE_RANGE"
          ? "Fixed window."
        : "Free intro period.";

const usesDurationDays = (type: MembershipPlanType) =>
  type === "HYBRID" || type === "DURATION" || type === "DATE_RANGE" || type === "TRIAL";

const usesVisitLimit = (type: MembershipPlanType) => type === "HYBRID" || type === "VISIT_PACK";

type PlanFormFieldsProps = {
  form: PlanFormState;
  setForm: Dispatch<SetStateAction<PlanFormState>>;
  showShapeHint?: boolean;
};

export function PlanFormFields({ form, setForm, showShapeHint = false }: PlanFormFieldsProps) {
  const showDurationDays = usesDurationDays(form.type);
  const showVisitLimit = usesVisitLimit(form.type);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-white/55">
          Plan name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Starter 12-week plan"
            maxLength={60}
            pattern="^(?!.*\\d{8,}).{1,60}$"
            title="Use 60 characters or fewer and avoid raw numeric IDs."
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
        <SearchableSelect
          label="Plan shape"
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
            label: formatEnumLabel(type),
            description: showShapeHint ? planTypeDescription(type) : undefined,
          }))}
        />
        {showShapeHint ? (
          <p className="md:col-span-2 inline-flex items-center gap-2 text-xs text-white/45">
            Plan shape controls expiry, visits, and public join copy.
            <HelpHint label="Plan shape" title="Plan shape">
              Hybrid uses days or visits, whichever comes first. Duration is days only. Visit pack
              is visits only. Date range is a fixed window. Trial is a free intro period.
            </HelpHint>
          </p>
        ) : null}
        <label className="grid gap-2 text-sm text-white/55">
          Price
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
            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
        {showDurationDays ? (
          <label className="grid gap-2 text-sm text-white/55">
            Duration days
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
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        ) : null}
        {showVisitLimit ? (
          <label className="grid gap-2 text-sm text-white/55">
            Visit limit
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
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
          Public
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
      <label className="grid gap-2 text-sm text-white/55">
        Short public description
        <input
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          placeholder="Best for regular members who want a monthly routine."
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
      </label>
    </>
  );
}
