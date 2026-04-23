import clsx from "clsx";

export function GlassCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={clsx("glass-panel rounded-[24px] p-5", className)}>{children}</section>;
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "lime" | "amber" | "red" }) {
  const tones = {
    neutral: "border-white/10 bg-white/8 text-white/70",
    lime: "border-lime-300/30 bg-lime-300/12 text-lime-200",
    amber: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    red: "border-red-300/30 bg-red-300/12 text-red-100"
  };
  return <span className={clsx("rounded-full border px-3 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}
