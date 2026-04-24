import { getProviderRegistryDiagnostics } from "@zook/core/providers";

export function summarizeProviderDiagnostics() {
  const diagnostics = getProviderRegistryDiagnostics();
  return Object.fromEntries(
    Object.entries(diagnostics).map(([category, value]) => [
      category,
      {
        selectedProvider: value.selectedProvider,
        activeProvider: value.activeProvider,
        status: value.status,
        mode: value.mode,
        configured: value.configured
      }
    ])
  );
}

export function logApiRequest(input: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  orgId?: string;
  providerError?: string;
}) {
  console.info("zook.api.request", {
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: input.durationMs,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.orgId ? { orgId: input.orgId } : {}),
    ...(input.providerError ? { providerError: input.providerError } : {})
  });
}
