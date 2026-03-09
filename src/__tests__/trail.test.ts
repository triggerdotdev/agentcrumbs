import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { trail, addSink, removeSink, resetSinks } from "../trail.js";
import { resetConfig } from "../env.js";
import { MemorySink } from "../sinks/memory.js";
import { NOOP } from "../noop.js";

describe("trail", () => {
  const originalEnv = process.env.AGENTCRUMBS;
  let sink: MemorySink;

  beforeEach(() => {
    resetConfig();
    resetSinks();
    sink = new MemorySink();
    addSink(sink);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENTCRUMBS;
    } else {
      process.env.AGENTCRUMBS = originalEnv;
    }
    resetConfig();
    resetSinks();
  });

  describe("noop when disabled", () => {
    it("returns NOOP when AGENTCRUMBS is not set", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      expect(crumb).toBe(NOOP);
      expect(crumb.enabled).toBe(false);
    });

    it("returns NOOP when namespace doesn't match", () => {
      process.env.AGENTCRUMBS = '{"ns":"auth-*"}';
      const crumb = trail("worker");
      expect(crumb).toBe(NOOP);
    });

    it("NOOP crumb does nothing", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      crumb("should not emit");
      expect(sink.entries).toHaveLength(0);
    });

    it("NOOP scope runs function without wrapping", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      const result = crumb.scope("op", () => 42);
      expect(result).toBe(42);
      expect(sink.entries).toHaveLength(0);
    });

    it("NOOP child returns NOOP", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      const child = crumb.child({ requestId: "abc" });
      expect(child).toBe(NOOP);
    });

    it("NOOP wrap returns original function", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      const fn = () => 42;
      const wrapped = crumb.wrap("fn", fn);
      expect(wrapped).toBe(fn);
    });

    it("NOOP session returns noop session", () => {
      delete process.env.AGENTCRUMBS;
      const crumb = trail("test");
      const s = crumb.session("test-session");
      expect(s.id).toBe("");
      s.crumb("should not emit");
      s.end();
      expect(sink.entries).toHaveLength(0);
    });
  });

  describe("enabled", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("returns enabled trail when AGENTCRUMBS is set", () => {
      const crumb = trail("test");
      expect(crumb.enabled).toBe(true);
      expect(crumb.namespace).toBe("test");
    });

    it("emits crumbs with structured data", () => {
      const crumb = trail("test");
      crumb("hello", { key: "value" });

      expect(sink.entries).toHaveLength(1);
      const entry = sink.entries[0]!;
      expect(entry.ns).toBe("test");
      expect(entry.msg).toBe("hello");
      expect(entry.data).toEqual({ key: "value" });
      expect(entry.type).toBe("crumb");
      expect(entry.pid).toBe(process.pid);
      expect(entry.ts).toBeDefined();
    });

    it("emits crumbs with tags", () => {
      const crumb = trail("test");
      crumb("tagged", { x: 1 }, { tags: ["perf", "cache"] });

      expect(sink.entries).toHaveLength(1);
      expect(sink.entries[0]!.tags).toEqual(["perf", "cache"]);
    });

    it("tracks delta time between crumbs", () => {
      const crumb = trail("test");
      crumb("first");
      crumb("second");

      expect(sink.entries).toHaveLength(2);
      expect(typeof sink.entries[1]!.dt).toBe("number");
    });

    it("child inherits context data", () => {
      const crumb = trail("test");
      const child = crumb.child({ requestId: "abc" });
      child("from child");

      expect(sink.entries).toHaveLength(1);
      expect(sink.entries[0]!.ctx).toEqual({ requestId: "abc" });
    });

    it("child merges context", () => {
      const crumb = trail("test");
      const child1 = crumb.child({ requestId: "abc" });
      const child2 = child1.child({ userId: "123" });
      child2("from grandchild");

      expect(sink.entries[0]!.ctx).toEqual({
        requestId: "abc",
        userId: "123",
      });
    });
  });

  describe("scope", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("emits enter and exit crumbs", () => {
      const crumb = trail("test");
      const result = crumb.scope("operation", (ctx) => {
        ctx.crumb("inside");
        return 42;
      });

      expect(result).toBe(42);
      expect(sink.entries).toHaveLength(3);
      expect(sink.entries[0]!.type).toBe("scope:enter");
      expect(sink.entries[0]!.msg).toBe("operation");
      expect(sink.entries[1]!.type).toBe("crumb");
      expect(sink.entries[1]!.msg).toBe("inside");
      expect(sink.entries[2]!.type).toBe("scope:exit");
      expect(sink.entries[2]!.msg).toBe("operation");
    });

    it("handles async scope", async () => {
      const crumb = trail("test");
      const result = await crumb.scope("async-op", async (ctx) => {
        ctx.crumb("async inside");
        return "done";
      });

      expect(result).toBe("done");
      expect(sink.entries).toHaveLength(3);
      expect(sink.entries[0]!.type).toBe("scope:enter");
      expect(sink.entries[2]!.type).toBe("scope:exit");
    });

    it("captures errors in scope", () => {
      const crumb = trail("test");
      expect(() =>
        crumb.scope("failing", () => {
          throw new Error("boom");
        })
      ).toThrow("boom");

      expect(sink.entries).toHaveLength(2);
      expect(sink.entries[0]!.type).toBe("scope:enter");
      expect(sink.entries[1]!.type).toBe("scope:error");
      expect((sink.entries[1]!.data as { message: string }).message).toBe("boom");
    });

    it("tracks trace IDs across scope", () => {
      const crumb = trail("test");
      crumb.scope("op", (ctx) => {
        ctx.crumb("inside");
        expect(ctx.traceId).toBeDefined();
      });

      const traceId = sink.entries[0]!.traceId;
      expect(traceId).toBeDefined();
      expect(sink.entries[1]!.traceId).toBe(traceId);
      expect(sink.entries[2]!.traceId).toBe(traceId);
    });

    it("increments depth for nested scopes", () => {
      const crumb = trail("test");
      crumb.scope("outer", (ctx1) => {
        ctx1.crumb.scope("inner", (ctx2) => {
          ctx2.crumb("deep");
        });
      });

      // outer enter (depth 1), inner enter (depth 2), deep (depth 2), inner exit (depth 2), outer exit (depth 1)
      expect(sink.entries[0]!.depth).toBe(1);
      expect(sink.entries[1]!.depth).toBe(2);
      expect(sink.entries[2]!.depth).toBe(2);
    });
  });

  describe("timing", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("tracks time between time/timeEnd", () => {
      const crumb = trail("test");
      crumb.time("db-query");
      crumb.timeEnd("db-query", { rows: 10 });

      expect(sink.entries).toHaveLength(1);
      expect(sink.entries[0]!.type).toBe("time");
      expect(sink.entries[0]!.msg).toBe("db-query");
      expect((sink.entries[0]!.data as { duration: number }).duration).toBeGreaterThanOrEqual(0);
      expect((sink.entries[0]!.data as { rows: number }).rows).toBe(10);
    });
  });

  describe("snapshot", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("captures a snapshot of an object", () => {
      const crumb = trail("test");
      const obj = { x: 1, y: [2, 3] };
      crumb.snapshot("state", obj);

      // Mutate original — snapshot should be independent
      obj.x = 999;

      expect(sink.entries).toHaveLength(1);
      expect(sink.entries[0]!.type).toBe("snapshot");
      expect(sink.entries[0]!.msg).toBe("state");
      expect(sink.entries[0]!.data).toEqual({ x: 1, y: [2, 3] });
    });
  });

  describe("assert", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("emits crumb on failed assertion", () => {
      const crumb = trail("test");
      crumb.assert(false, "should be true");

      expect(sink.entries).toHaveLength(1);
      expect(sink.entries[0]!.type).toBe("assert");
      expect(sink.entries[0]!.msg).toBe("should be true");
    });

    it("does not emit on passing assertion", () => {
      const crumb = trail("test");
      crumb.assert(true, "is true");

      expect(sink.entries).toHaveLength(0);
    });
  });

  describe("session", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("creates a session with start/end crumbs", () => {
      const crumb = trail("test");
      const s = crumb.session("my-session");
      s.crumb("inside session");
      s.end();

      expect(sink.entries).toHaveLength(3);
      expect(sink.entries[0]!.type).toBe("session:start");
      expect(sink.entries[0]!.sid).toBeDefined();
      expect(sink.entries[1]!.type).toBe("crumb");
      expect(sink.entries[1]!.sid).toBe(sink.entries[0]!.sid);
      expect(sink.entries[2]!.type).toBe("session:end");
    });

    it("supports scoped sessions", async () => {
      const crumb = trail("test");
      await crumb.session("scoped", async (s) => {
        s.crumb("inside");
      });

      expect(sink.entries).toHaveLength(3);
      expect(sink.entries[0]!.type).toBe("session:start");
      expect(sink.entries[1]!.type).toBe("crumb");
      expect(sink.entries[2]!.type).toBe("session:end");
    });
  });

  describe("wrap", () => {
    beforeEach(() => {
      process.env.AGENTCRUMBS = "1";
      resetConfig();
    });

    it("wraps a function with scope", () => {
      const crumb = trail("test");
      const add = (a: number, b: number) => a + b;
      const wrapped = crumb.wrap("add", add);

      const result = wrapped(2, 3);
      expect(result).toBe(5);
      expect(sink.entries.some((e) => e.type === "scope:enter" && e.msg === "add")).toBe(true);
      expect(sink.entries.some((e) => e.type === "scope:exit" && e.msg === "add")).toBe(true);
    });
  });
});
