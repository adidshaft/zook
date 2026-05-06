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
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
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
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-black text-white">
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
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="zook-focus resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
              selected.has(option)
                ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/8"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
