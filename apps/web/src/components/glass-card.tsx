import clsx from "clsx";

export function GlassCard({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string | undefined;
  variant?: "default" | "strong" | "muted" | "selected" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "glass-panel rounded-[28px] p-5",
    strong:
      "glass-panel rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-6",
    muted: "rounded-[24px] border border-white/10 bg-black/25 p-5",
    selected:
      "rounded-[28px] border border-[rgba(185,244,85,0.45)] bg-[rgba(185,244,85,0.1)] p-5 shadow-[var(--zook-shadow-glow-lime)] backdrop-blur-2xl",
    success:
      "rounded-[28px] border border-[rgba(185,244,85,0.34)] bg-[rgba(185,244,85,0.08)] p-5 shadow-[var(--zook-shadow-glow-lime)] backdrop-blur-2xl",
    warning:
      "rounded-[28px] border border-[rgba(242,201,76,0.28)] bg-[rgba(242,201,76,0.1)] p-5 shadow-[var(--zook-shadow-glass)] backdrop-blur-2xl",
    danger:
      "rounded-[28px] border border-[rgba(255,90,61,0.28)] bg-[rgba(255,90,61,0.1)] p-5 shadow-[var(--zook-shadow-glass)] backdrop-blur-2xl",
  };
  return <section className={clsx(variants[variant], className)}>{children}</section>;
}

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue";

export function Pill({
  children,
  tone = "neutral",
  className,
  ...props
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string | undefined;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const tones = {
    neutral: "border-white/10 bg-white/8 text-white/70",
    lime: "border-lime-300/45 bg-lime-300/16 text-lime-200",
    amber: "border-[rgba(242,201,76,0.32)] bg-[rgba(242,201,76,0.12)] text-[#f8e7a0]",
    red: "border-[rgba(255,90,61,0.32)] bg-[rgba(255,90,61,0.12)] text-[#ffc9bc]",
    blue: "border-sky-300/30 bg-sky-300/12 text-sky-100",
  };
  return (
    <span
      {...props}
      className={clsx("rounded-full border px-3 py-1 text-xs font-medium", tones[tone], className)}
    >
      {children}
    </span>
  );
}
