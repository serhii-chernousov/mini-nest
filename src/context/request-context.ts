import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

interface RequestStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();
const REQUEST_ID = /^[\w.-]{1,128}$/;

export function sanitizeRequestId(value?: string): string {
  const trimmed = value?.trim() ?? "";
  return REQUEST_ID.test(trimmed) ? trimmed : randomUUID();
}

export function runWithRequestContext<T>(
  requestId: string,
  fn: () => T,
): T {
  return storage.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
