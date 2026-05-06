import { getProviderRegistryDiagnostics } from "@zook/core/providers";
import { zookLogger } from "@zook/core";
import { getRateLimitDiagnostics } from "./rate-limit";

export function summarizeProviderDiagnostics() {
  const diagnostics = getProviderRegistryDiagnostics();
  return {
    ...Object.fromEntries(
      Object.entries(diagnostics).map(([category, value]) => [
        category,
        {
          selectedProvider: value.selectedProvider,
          activeProvider: value.activeProvider,
          status: value.status,
          mode: value.mode,
          configured: value.configured,
        },
      ]),
    ),
    rateLimit: getRateLimitDiagnostics(),
  };
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
  zookLogger.info(
    "zook.api.request",
    {
      method: input.method,
      path: input.path,
      status: input.status,
      durationMs: input.durationMs,
      ...(input.providerError ? { providerError: input.providerError } : {}),
    },
    {
      requestId: input.requestId,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.orgId ? { orgId: input.orgId } : {}),
    },
  );
}
