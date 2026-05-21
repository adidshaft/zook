import { GridBackdrop } from "@/components/hero-ornaments";

export function HomeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <GridBackdrop className="opacity-90" />
      <div className="absolute inset-x-0 top-0 h-[680px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_8%,transparent),color-mix(in_srgb,var(--accent)_0%,transparent)_66%)]" />
      <div className="absolute left-0 top-24 h-px w-full bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent)_18%,transparent)] to-transparent" />
      <div className="absolute bottom-[18%] left-0 h-px w-full bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--feedback-warning)_12%,transparent)] to-transparent" />
      <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--border)_70%,transparent)] to-transparent" />
      <div className="absolute inset-y-0 right-[14%] w-px bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--border)_70%,transparent)] to-transparent" />
    </div>
  );
}
