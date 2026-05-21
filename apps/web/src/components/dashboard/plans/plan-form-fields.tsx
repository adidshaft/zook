import type { Dispatch, SetStateAction } from "react";
import { HelpHint, SearchableSelect } from "../../ui";
import type { MembershipPlanType } from "../../dashboard-operational-model";
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

type PlanFormFieldsProps = {
  form: PlanFormState;
  setForm: Dispatch<SetStateAction<PlanFormState>>;
  showShapeHint?: boolean;
};

export function PlanFormFields({ form, setForm, showShapeHint = false }: PlanFormFieldsProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Plan name"
          maxLength={60}
          pattern="^(?!.*\\d{8,}).{1,60}$"
          title="Use 60 characters or fewer and avoid raw numeric IDs."
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <SearchableSelect
          label="Plan shape"
          value={form.type}
          onChange={(type) =>
            setForm((current) => ({
              ...current,
              type: type as MembershipPlanType,
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
        <input
          value={form.priceRupees}
          onChange={(event) =>
            setForm((current) => ({ ...current, priceRupees: event.target.value }))
          }
          placeholder="Price in rupees"
          inputMode="decimal"
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <input
          value={form.durationDays}
          onChange={(event) =>
            setForm((current) => ({ ...current, durationDays: event.target.value }))
          }
          placeholder="Duration days"
          inputMode="numeric"
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
        <input
          value={form.visitLimit}
          onChange={(event) =>
            setForm((current) => ({ ...current, visitLimit: event.target.value }))
          }
          placeholder="Visit limit"
          inputMode="numeric"
          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        />
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
      <input
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="Short public description"
        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
      />
    </>
  );
}
