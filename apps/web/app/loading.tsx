import { GlassCard, Pill } from "@/components/glass-card";

export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-8">
      <GlassCard className="w-full max-w-md">
        <Pill>Loading</Pill>
        <div className="mt-5 h-8 w-2/3 rounded-full bg-white/10" />
        <div className="mt-4 h-4 w-full rounded-full bg-white/8" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-white/8" />
      </GlassCard>
    </main>
  );
}
