"use client";

import clsx from "clsx";
import React, {
  createContext,
  useContext,
  useId,
  useMemo,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type RadioCardValue = string;

type RadioCardGroupContextValue = {
  name: string;
  value: RadioCardValue;
  onChange: (value: RadioCardValue) => void;
  values: RadioCardValue[];
  disabled?: boolean;
};

const RadioCardGroupContext = createContext<RadioCardGroupContextValue | null>(null);

export type RadioCardOption<Value extends RadioCardValue = RadioCardValue> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode | undefined;
  disabled?: boolean | undefined;
};

export function getRadioCardNextIndex(
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
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1 + optionsLength) % optionsLength;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + optionsLength) % optionsLength;
  }
  return currentIndex;
}

function useRadioCardGroupContext() {
  const context = useContext(RadioCardGroupContext);
  if (!context) {
    throw new Error("RadioCardGroup.Card must be rendered inside RadioCardGroup.");
  }
  return context;
}

function RadioCardGroupRoot<Value extends RadioCardValue>({
  name,
  value,
  options,
  onChange,
  label,
  className,
  columns = "auto",
  disabled,
  children,
}: {
  name: string;
  value: Value;
  options: Array<RadioCardOption<Value>>;
  onChange: (value: Value) => void;
  label?: string | undefined;
  className?: string | undefined;
  columns?: "auto" | 1 | 2 | 3 | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}) {
  const generatedName = useId();
  const values = useMemo(() => options.map((option) => option.value), [options]);
  const gridClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2";

  const context = useMemo<RadioCardGroupContextValue>(
    () => ({
      name: name || generatedName,
      value,
      onChange: (nextValue) => onChange(nextValue as Value),
      values,
      ...(disabled === undefined ? {} : { disabled }),
    }),
    [disabled, generatedName, name, onChange, value, values],
  );

  return (
    <RadioCardGroupContext.Provider value={context}>
      <div
        role="radiogroup"
        aria-label={label ?? name}
        className={clsx("grid gap-3", gridClass, className)}
      >
        {children ??
          options.map((option) => (
            <RadioCard
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              description={option.description}
            >
              {option.label}
            </RadioCard>
          ))}
      </div>
    </RadioCardGroupContext.Provider>
  );
}

function RadioCard({
  value,
  children,
  description,
  disabled,
  className,
  meta,
}: {
  value: RadioCardValue;
  children: ReactNode;
  description?: ReactNode | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  meta?: ReactNode | undefined;
}) {
  const context = useRadioCardGroupContext();
  const selected = context.value === value;
  const itemDisabled = Boolean(disabled || context.disabled);
  const itemIndex = context.values.indexOf(value);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const nextIndex = getRadioCardNextIndex(itemIndex, event.key, context.values.length);
    if (nextIndex === itemIndex || nextIndex < 0) {
      return;
    }
    event.preventDefault();
    const nextValue = context.values[nextIndex];
    if (nextValue) {
      context.onChange(nextValue);
      const next = event.currentTarget
        .closest('[role="radiogroup"]')
        ?.querySelector<HTMLButtonElement>(`[data-radio-card-value="${CSS.escape(nextValue)}"]`);
      next?.focus();
    }
  }

  return (
    <button
      type="button"
      role="radio"
      name={context.name}
      aria-checked={selected}
      disabled={itemDisabled}
      tabIndex={selected ? 0 : -1}
      data-radio-card-value={value}
      onClick={() => context.onChange(value)}
      onKeyDown={handleKeyDown}
      className={clsx(
        "zook-focus group min-h-16 rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-lime-300/55 bg-lime-300/14 text-white shadow-[inset_0_0_0_1px_rgba(190,242,100,0.22)]"
          : "border-white/10 bg-black/20 text-white/68 hover:border-white/18 hover:bg-white/6",
        className,
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-medium text-inherit">{children}</span>
          {description ? (
            <span className="mt-1 block text-sm leading-5 text-white/45">{description}</span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
            selected ? "border-lime-200 bg-lime-300 text-black" : "border-white/18 bg-black/30",
          )}
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
        </span>
      </span>
      {meta ? <span className="mt-3 block text-xs text-white/45">{meta}</span> : null}
    </button>
  );
}

export const RadioCardGroup = Object.assign(RadioCardGroupRoot, {
  Card: RadioCard,
});
