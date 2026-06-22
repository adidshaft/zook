type DemoTransport = {
  request<T>(
    path: string,
    init?: { body?: unknown; method?: string } & Record<string, unknown>,
  ): Promise<T>;
};

export function createDemoTransport(): DemoTransport {
  return {
    request: demoMobileApiFetch,
  };
}

export async function demoMobileApiFetch<T>(): Promise<T> {
  throw new Error("Test data is not included in this build.");
}
