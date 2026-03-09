import { AsyncLocalStorage } from "node:async_hooks";

export type DebugContext = {
  namespace: string;
  contextData: Record<string, unknown>;
  traceId: string;
  depth: number;
  sessionId?: string;
};

export const debugStorage = new AsyncLocalStorage<DebugContext>();

export function getContext(): DebugContext | undefined {
  return debugStorage.getStore();
}

export function runWithContext<T>(ctx: DebugContext, fn: () => T): T {
  return debugStorage.run(ctx, fn);
}
