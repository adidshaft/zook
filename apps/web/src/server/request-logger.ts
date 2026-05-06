import { getProviderRegistryDiagnostics } from "@zook/core/providers";
import { zookLogger } from "@zook/core";
import { getRateLimitDiagnostics } from "./rate-limit";
import { getServerCacheDiagnostics } from "./server-cache";

export function summarizeProviderDiagnostics() {
  const diagnostics = getProviderRegistryDiagnostics();
  const summarize = (value: (typeof diagnostics)[keyof typeof diagnostics]) => ({
    selectedProvider: value.selectedProvider,
    activeProvider: value.activeProvider,
    status: value.status,
    mode: value.mode,
    configured: value.configured,
  });

  return {
    ai: summarize(diagnostics.ai),
    email: summarize(diagnostics.email),
    map: summarize(diagnostics.map),
    payment: summarize(diagnostics.payment),
    push: summarize(diagnostics.push),
    sms: summarize(diagnostics.sms),
    storage: summarize(diagnostics.storage),
    whatsapp: summarize(diagnostics.whatsapp),
    rateLimit: getRateLimitDiagnostics(),
    serverCache: getServerCacheDiagnostics(),
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
