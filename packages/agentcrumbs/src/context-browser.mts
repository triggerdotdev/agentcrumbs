export type DebugContext = {
  namespace: string;
  contextData: Record<string, unknown>;
  traceId: string;
  depth: number;
  sessionId?: string;
};

// Browser JS is single-threaded so a simple stack replaces AsyncLocalStorage.
// Limitation: concurrent Promise.all branches won't isolate context.
const contextStack: DebugContext[] = [];

export function getContext(): DebugContext | undefined {
  return contextStack[contextStack.length - 1];
}

export function runWithContext<T>(ctx: DebugContext, fn: () => T): T {
  contextStack.push(ctx);
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (val) => {
          contextStack.pop();
          return val;
        },
        (err) => {
          contextStack.pop();
          throw err;
        },
      ) as T;
    }
    contextStack.pop();
    return result;
  } catch (err) {
    contextStack.pop();
    throw err;
  }
}
