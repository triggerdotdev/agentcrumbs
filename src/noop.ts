import type { TrailFunction, Session } from "./types.js";

const NOOP_SESSION: Session = Object.freeze({
  id: "",
  name: "",
  crumb: function noop() {},
  end: function noop() {},
});

function noopSession(name: string, fn?: unknown): unknown {
  if (typeof fn === "function") {
    return fn(NOOP_SESSION);
  }
  return NOOP_SESSION;
}

export const NOOP: TrailFunction = Object.assign(
  function noop() {},
  {
    enabled: false as const,
    namespace: "",
    child: () => NOOP,
    scope: (_name: string, fn: (ctx: { crumb: TrailFunction; traceId: string }) => unknown) =>
      fn({ crumb: NOOP, traceId: "" }),
    wrap: (_name: string, fn: unknown) => fn,
    time: function noop() {},
    timeEnd: function noop() {},
    snapshot: function noop() {},
    assert: function noop() {},
    session: noopSession as TrailFunction["session"],
  }
) as TrailFunction;

Object.freeze(NOOP);
