import { messageFromError, showToast } from "@/lib/toast";

export function queryString(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) {
      params.set(key, value);
    }
  }
  const result = params.toString();
  return result ? `?${result}` : "";
}

export function getMutationContext(token?: string, orgId?: string) {
  if (!token) {
    throw new Error("Authentication is required.");
  }
  if (!orgId) {
    throw new Error("An active organization is required.");
  }
  return { token, orgId };
}

export function notifyMutationSuccess(message: string) {
  showToast({ tone: "success", haptic: "success", message });
}

export function notifyMutationWarning(message: string) {
  showToast({ tone: "amber", haptic: "warning", message });
}

export function notifyMutationError(error: unknown, fallback: string) {
  showToast({
    tone: "danger",
    haptic: "error",
    title: "Action failed",
    message: messageFromError(error, fallback),
  });
}
