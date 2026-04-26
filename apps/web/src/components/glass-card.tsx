import clsx from "clsx";

export function GlassCard({
  children,
  className,
  variant = "default"
}: {
  children: React.ReactNode;
  className?: string | undefined;
  variant?: "default" | "strong" | "muted";
}) {
  const variants = {
    default: "glass-panel rounded-[28px] p-5",
    strong:
      "glass-panel rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-6",
    muted: "rounded-[24px] border border-white/10 bg-black/25 p-5"
  };
  return <section className={clsx(variants[variant], className)}>{children}</section>;
}

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue";

export function Pill({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string | undefined;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/8 text-white/70",
    lime: "border-lime-300/45 bg-lime-300/16 text-lime-200",
    amber: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    red: "border-red-300/30 bg-red-300/12 text-red-100",
    blue: "border-sky-300/30 bg-sky-300/12 text-sky-100"
  };
  return <span className={clsx("rounded-full border px-3 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}
