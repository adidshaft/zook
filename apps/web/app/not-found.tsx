import Link from "next/link";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <GlassCard className="max-w-lg">
        <Pill tone="amber">Not found</Pill>
        <h1 className="mt-5 text-3xl font-semibold text-white">This Zook page is not available.</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          The link may be old, unpublished, or only available after signing in.
        </p>
        <Link
          href="/"
          className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
        >
          Back to Zook
        </Link>
      </GlassCard>
    </main>
  );
}
