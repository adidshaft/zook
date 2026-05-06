import Link from "next/link";
import Image from "next/image";

export function ZookLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="relative h-10 w-10 overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(185,244,85,0.24)]">
        <Image
          src="/icons/AppIcon-1024.png"
          alt=""
          fill
          priority
          sizes="40px"
          className="object-cover"
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
