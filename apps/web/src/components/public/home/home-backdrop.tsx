import { GridBackdrop } from "@/components/hero-ornaments";

export function HomeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <GridBackdrop className="opacity-90" />
      <div className="absolute inset-x-0 top-0 h-[680px] bg-[linear-gradient(180deg,rgba(185,244,85,0.08),rgba(185,244,85,0)_66%)]" />
      <div className="absolute left-0 top-24 h-px w-full bg-gradient-to-r from-transparent via-lime-200/18 to-transparent" />
      <div className="absolute bottom-[18%] left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-100/10 to-transparent" />
      <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
      <div className="absolute inset-y-0 right-[14%] w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
    </div>
  );
}
