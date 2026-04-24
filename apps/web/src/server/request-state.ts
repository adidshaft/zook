import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type RequestState = {
  requestId: string;
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
