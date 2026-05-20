import { EmptyState, GlassCard } from "@/components/primitives";

export function MemberListEmptyState({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <GlassCard variant="compact">
      <EmptyState title={title} body={subtitle ?? ""} />
    </GlassCard>
  );
}
