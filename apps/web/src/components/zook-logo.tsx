import Link from "next/link";
import Image from "next/image";

export function ZookLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_12px_40px_rgba(185,244,85,0.22)]">
        <Image
          src="/icons/icon-192.png"
          alt="Zook"
          width={40}
          height={40}
          className="h-10 w-10"
          priority
        />
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
