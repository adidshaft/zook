import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestState = {
  requestId: string;
  userId?: string;
  orgId?: string;
};

const requestStateStorage = new AsyncLocalStorage<RequestState>();

export function createRequestId() {
  return randomUUID();
}

export function runWithRequestState<T>(state: RequestState, fn: () => Promise<T> | T) {
  return requestStateStorage.run(state, fn);
}

export function getRequestState() {
  return requestStateStorage.getStore();
}

export function currentRequestId() {
  return getRequestState()?.requestId;
}

export function mergeRequestLogContext(context: Pick<RequestState, "userId" | "orgId">) {
  const state = getRequestState();
  if (!state) {
    return;
  }
  if (context.userId) {
    state.userId = context.userId;
  }
  if (context.orgId) {
    state.orgId = context.orgId;
  }
}
