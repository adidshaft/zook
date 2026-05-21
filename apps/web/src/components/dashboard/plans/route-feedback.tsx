import { ErrorNotice } from "../operational-shared";

export function RouteFeedback({ error, status }: { error: string; status: string }) {
  if (error) {
    return <ErrorNotice message={error} />;
  }
  if (status) {
    return (
      <p className="rounded-2xl border border-lime-300/20 bg-lime-300/8 px-4 py-3 text-sm text-lime-100">
        {status}
      </p>
    );
  }
  return null;
}
