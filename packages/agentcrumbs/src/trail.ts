import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type {
  Crumb,
  CrumbOptions,
  CrumbType,
  Session,
  Sink,
  TrailFunction,
} from "./types.js";
import { NOOP } from "./noop.js";
import { isNamespaceEnabled, getCollectorUrl, getFormat, getApp } from "./env.js";
import { getContext, runWithContext, type DebugContext } from "./context.js";
import { ConsoleSink } from "./sinks/console.js";
import { HttpSink } from "./sinks/socket.js";

const SESSION_FILE = "/tmp/agentcrumbs.session";

const globalSinks: Sink[] = [];
let sinksInitialized = false;

function ensureSinks(): void {
  if (sinksInitialized) return;
  sinksInitialized = true;

  // HTTP sink — fire-and-forget POST to collector. If collector isn't
  // running, fetch() silently fails. No connection state to manage.
  const url = getCollectorUrl();
  globalSinks.push(new HttpSink(url));

  // Console sink — always on as fallback. Crumbs show in stderr so
  // they're visible even without the collector running.
  const format = getFormat();
  if (format === "json") {
    globalSinks.push({
      write(crumb: Crumb) {
        process.stderr.write(JSON.stringify(crumb) + "\n");
      },
    });
  } else {
    globalSinks.push(new ConsoleSink());
  }
}

export function addSink(sink: Sink): void {
  globalSinks.push(sink);
  sinksInitialized = true;
}

export function removeSink(sink: Sink): void {
  const idx = globalSinks.indexOf(sink);
  if (idx !== -1) globalSinks.splice(idx, 1);
}

/** Reset sinks — for testing */
export function resetSinks(): void {
  globalSinks.length = 0;
  sinksInitialized = false;
}

function emit(crumb: Crumb): void {
  ensureSinks();
  for (const sink of globalSinks) {
    try {
      sink.write(crumb);
    } catch {
      // Never let a sink error affect the application
    }
  }
}

function getCliSessionId(): string | undefined {
  try {
    const content = readFileSync(SESSION_FILE, "utf-8").trim();
    return content || undefined;
  } catch {
    return undefined;
  }
}

function createTrailFunction(
  namespace: string,
  parentCtx?: Record<string, unknown>
): TrailFunction {
  let lastTime = performance.now();
  const timers = new Map<string, number>();

  function makeCrumb(
    msg: string,
    type: CrumbType,
    data?: unknown,
    options?: CrumbOptions,
    overrides?: Partial<Crumb>
  ): Crumb {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;

    const asyncCtx = getContext();
    const cliSession = getCliSessionId();

    const crumb: Crumb = {
      app: getApp(),
      ts: new Date().toISOString(),
      ns: namespace,
      msg,
      type,
      dt: Math.round(dt * 100) / 100,
      pid: process.pid,
      ...overrides,
    };

    if (data !== undefined) crumb.data = data;

    // Merge context: parent -> async -> explicit
    const mergedCtx = {
      ...parentCtx,
      ...asyncCtx?.contextData,
    };
    if (Object.keys(mergedCtx).length > 0) crumb.ctx = mergedCtx;

    if (!crumb.traceId && asyncCtx?.traceId) crumb.traceId = asyncCtx.traceId;
    if (!crumb.depth && asyncCtx?.depth) crumb.depth = asyncCtx.depth;

    // Session: prefer async context session, then CLI session
    const sid = asyncCtx?.sessionId ?? cliSession;
    if (sid) crumb.sid = sid;

    if (options?.tags && options.tags.length > 0) crumb.tags = options.tags;

    return crumb;
  }

  const fn = function trailFn(
    msg: string,
    data?: unknown,
    options?: CrumbOptions
  ): void {
    emit(makeCrumb(msg, "crumb", data, options));
  };

  fn.enabled = true;
  fn.namespace = namespace;

  fn.child = (ctx: Record<string, unknown>): TrailFunction => {
    return createTrailFunction(namespace, { ...parentCtx, ...ctx });
  };

  fn.scope = <T>(
    name: string,
    scopeFn: (ctx: { crumb: TrailFunction; traceId: string }) => T | Promise<T>
  ): T | Promise<T> => {
    const traceId = randomUUID().slice(0, 8);
    const asyncCtx = getContext();
    const depth = (asyncCtx?.depth ?? 0) + 1;

    const newCtx: DebugContext = {
      namespace,
      contextData: { ...parentCtx, ...asyncCtx?.contextData },
      traceId,
      depth,
      sessionId: asyncCtx?.sessionId,
    };

    emit(makeCrumb(name, "scope:enter", undefined, undefined, { traceId, depth }));
    const startTime = performance.now();

    const childTrail = createTrailFunction(namespace, newCtx.contextData);

    const finish = (error?: unknown) => {
      const duration = Math.round((performance.now() - startTime) * 100) / 100;
      if (error) {
        const errorData =
          error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : { value: error };
        emit(
          makeCrumb(name, "scope:error", { ...errorData, duration }, undefined, {
            traceId,
            depth,
          })
        );
      } else {
        emit(
          makeCrumb(name, "scope:exit", { duration }, undefined, {
            traceId,
            depth,
          })
        );
      }
    };

    try {
      const result = runWithContext(newCtx, () =>
        scopeFn({ crumb: childTrail, traceId })
      );

      if (result instanceof Promise) {
        return result.then(
          (val) => {
            finish();
            return val;
          },
          (err) => {
            finish(err);
            throw err;
          }
        ) as T | Promise<T>;
      }

      finish();
      return result;
    } catch (err) {
      finish(err);
      throw err;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn.wrap = <T extends (...args: any[]) => any>(
    name: string,
    wrappedFn: T
  ): T => {
    return ((...args: unknown[]) => {
      return fn.scope(name, () => wrappedFn(...args));
    }) as T;
  };

  fn.time = (label: string): void => {
    timers.set(label, performance.now());
  };

  fn.timeEnd = (label: string, data?: unknown): void => {
    const start = timers.get(label);
    if (start === undefined) return;
    timers.delete(label);
    const duration = Math.round((performance.now() - start) * 100) / 100;
    emit(makeCrumb(label, "time", { ...((data as object) ?? {}), duration }));
  };

  fn.snapshot = (label: string, obj: unknown): void => {
    let cloned: unknown;
    try {
      cloned = structuredClone(obj);
    } catch {
      cloned = obj;
    }
    emit(makeCrumb(label, "snapshot", cloned));
  };

  fn.assert = (condition: unknown, msg: string): void => {
    if (!condition) {
      emit(makeCrumb(msg, "assert", { passed: false }));
    }
  };

  fn.session = ((
    name: string,
    sessionFn?: (session: Session) => unknown
  ): unknown => {
    const id = randomUUID().slice(0, 8);
    const asyncCtx = getContext();

    const sessionCtx: DebugContext = {
      namespace,
      contextData: { ...parentCtx, ...asyncCtx?.contextData },
      traceId: asyncCtx?.traceId ?? "",
      depth: asyncCtx?.depth ?? 0,
      sessionId: id,
    };

    emit(makeCrumb(name, "session:start", undefined, undefined, { sid: id }));

    const session: Session = {
      id,
      name,
      crumb: (msg: string, data?: unknown, options?: CrumbOptions) => {
        runWithContext(sessionCtx, () => {
          emit(makeCrumb(msg, "crumb", data, options, { sid: id }));
        });
      },
      end: () => {
        emit(makeCrumb(name, "session:end", undefined, undefined, { sid: id }));
      },
    };

    if (typeof sessionFn === "function") {
      const result = runWithContext(sessionCtx, () => sessionFn(session));
      if (result instanceof Promise) {
        return result.then(
          (val) => {
            session.end();
            return val;
          },
          (err) => {
            session.end();
            throw err;
          }
        );
      }
      session.end();
      return result;
    }

    return session;
  }) as TrailFunction["session"];

  return fn as TrailFunction;
}

export function trail(namespace: string): TrailFunction {
  if (!isNamespaceEnabled(namespace)) {
    return NOOP;
  }
  return createTrailFunction(namespace);
}
