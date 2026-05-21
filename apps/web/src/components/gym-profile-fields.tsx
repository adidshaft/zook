import { formatEnumLabel } from "@/lib/format";

export const gymTypes = [
  "Strength gym",
  "Premium fitness club",
  "Cross-training box",
  "Yoga and wellness studio",
  "Personal training studio",
  "Sports performance center",
];

export const facilityOptions = [
  "Strength floor",
  "Cardio zone",
  "Group classes",
  "Personal training",
  "Locker room",
  "Showers",
  "Nutrition bar",
  "Parking",
  "Steam room",
  "Physio room",
  "Women-only hours",
  "Open gym",
];

export const amenityOptions = [
  "Air conditioning",
  "Certified trainers",
  "QR entry",
  "Desk pickup",
  "UPI payments",
  "Body composition",
  "Diet plans",
  "Flexible plans",
];

export const equipmentOptions = [
  "Treadmills",
  "Elliptical trainers",
  "Stationary bikes",
  "Rowing machines",
  "Stair climbers",
  "Cable crossover machine",
  "Functional trainer",
  "Smith machine",
  "Power racks",
  "Squat racks",
  "Flat benches",
  "Adjustable benches",
  "Olympic barbells",
  "EZ curl bars",
  "Dumbbells",
  "Kettlebells",
  "Weight plates",
  "Leg press machine",
  "Hack squat machine",
  "Leg extension machine",
  "Seated leg curl machine",
  "Calf raise machine",
  "Chest press machine",
  "Pec deck machine",
  "Lat pulldown machine",
  "Seated row machine",
  "Shoulder press machine",
  "Assisted pull-up machine",
  "Dip station",
  "Pull-up bar",
  "Preacher curl bench",
  "Ab crunch machine",
  "Roman chair",
  "Battle ropes",
  "Medicine balls",
  "TRX suspension trainer",
  "Foam rollers",
  "Yoga mats",
  "Hip thrust station",
];

export function listToText(value?: string[] | null) {
  return (value ?? []).join(", ");
}

export function textToList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]/60"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
            {formatEnumLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="zook-focus resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]/60"
      />
    </label>
  );
}

export function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = new Set(textToList(value));
  const toggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange(Array.from(next).join(", "));
  };

  return (
    <div className="grid gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--bg-sunken)]/60 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
