"use client";

import clsx from "clsx";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
};

export function filterSearchableOptions(
  options: SearchableSelectOption[],
  query: string,
  limit = 100,
) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalized),
      )
    : options;
  return filtered.slice(0, limit);
}

export function getSearchableSelectNextIndex(
  currentIndex: number,
  key: string,
  optionsLength: number,
) {
  if (optionsLength <= 0) {
    return -1;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return optionsLength - 1;
  }
  if (key === "ArrowDown") {
    return (currentIndex + 1 + optionsLength) % optionsLength;
  }
  if (key === "ArrowUp") {
    return (currentIndex - 1 + optionsLength) % optionsLength;
  }
  return currentIndex;
}

export function selectedOptionLabels(options: SearchableSelectOption[], values: string[]) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => labels.get(value) ?? value);
}

export function SearchableSelect({
  label,
  options,
  value,
  values,
  onChange,
  onValuesChange,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyLabel = "No matches",
  className,
  disabled,
  multiple = false,
}: {
  label: string;
  options: SearchableSelectOption[];
  value?: string | undefined;
  values?: string[] | undefined;
  onChange?: ((value: string) => void) | undefined;
  onValuesChange?: ((values: string[]) => void) | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyLabel?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  multiple?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedValues = multiple ? (values ?? []) : value ? [value] : [];
  const selectedLabels = selectedOptionLabels(options, selectedValues);
  const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query]);

  function openMenu() {
    if (disabled) {
      return;
    }
    setOpen(true);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function selectValue(nextValue: string) {
    if (multiple) {
      const current = new Set(values ?? []);
      if (current.has(nextValue)) {
        current.delete(nextValue);
      } else {
        current.add(nextValue);
      }
      onValuesChange?.([...current]);
      return;
    }
    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option && !option.disabled) {
        selectValue(option.value);
      }
      return;
    }
    const nextIndex = getSearchableSelectNextIndex(activeIndex, event.key, filteredOptions.length);
    if (nextIndex !== activeIndex && nextIndex >= 0) {
      event.preventDefault();
      setActiveIndex(nextIndex);
    }
  }

  return (
    <div className={clsx("relative grid gap-2 text-sm text-white/62", className)}>
      <span>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="zook-focus flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 text-left text-sm text-white transition hover:bg-white/6 disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/45" aria-hidden="true" />
      </button>
      {multiple && selectedLabels.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((selectedValue, index) => (
            <button
              key={selectedValue}
              type="button"
              onClick={() => selectValue(selectedValue)}
              className="zook-focus inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-xs text-white/72"
            >
              {selectedLabels[index]}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="absolute left-0 right-0 top-full z-[150] mt-2 rounded-2xl border border-white/10 bg-zinc-950/98 p-2 shadow-2xl shadow-black/55 backdrop-blur">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-white/45">
            <Search className="h-4 w-4" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </label>
          <div role="listbox" aria-label={label} className="mt-2 max-h-72 overflow-y-auto">
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const selected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectValue(option.value)}
                    className={clsx(
                      "zook-focus flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition disabled:opacity-40",
                      activeIndex === index ? "bg-white/10 text-white" : "text-white/68",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-white/42">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-200" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-sm text-white/45">{emptyLabel}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
