import Link from "next/link";

export function ZookLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-lime-300 text-lg font-black text-black shadow-[0_12px_40px_rgba(185,244,85,0.22)]">
        Z
      </span>
      {!compact ? (
        <span>
          <span className="block text-lg font-semibold tracking-tight">Zook</span>
          <span className="block text-xs text-white/45">Gym OS</span>
        </span>
      ) : null}
    </Link>
  );
}
