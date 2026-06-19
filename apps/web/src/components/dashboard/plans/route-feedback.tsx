import { ErrorNotice } from "../operational-shared";

export function RouteFeedback({ error, status }: { error: string; status: string }) {
  if (error) {
    return <ErrorNotice message={error} />;
  }
  if (status) {
    return (
      <p className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm text-blue-50">
        {status}
      </p>
    );
  }
  return null;
}
