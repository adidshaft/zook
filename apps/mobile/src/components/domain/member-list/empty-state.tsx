import { EmptyState, Card } from "@/components/primitives";

export function MemberListEmptyState({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <Card variant="compact">
      <EmptyState title={title} body={subtitle ?? ""} />
    </Card>
  );
}
