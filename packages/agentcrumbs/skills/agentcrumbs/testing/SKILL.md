---
name: agentcrumbs/testing
description: >
  Testing with agentcrumbs MemorySink, addSink, removeSink, capturing
  crumbs in tests, asserting on debug output, waitFor async crumbs,
  test setup and teardown patterns. Activate when writing tests that
  verify debug tracing behavior, using MemorySink, or testing code
  that uses agentcrumbs trail functions.
type: sub-skill
library: agentcrumbs
library_version: "0.1.0"
requires:
  - agentcrumbs/core
sources:
  - "triggerdotdev/trigger-labs:debug-mode/src/sinks/memory.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/trail.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/__tests__/trail.test.ts"
---

# agentcrumbs — Testing

This skill builds on agentcrumbs/core. Read it first for foundational concepts.

## Setup

Use `MemorySink` to capture crumbs in tests. Set `AGENTCRUMBS=1` in the test environment to enable tracing.

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { trail, addSink, MemorySink } from "agentcrumbs";

describe("my feature", () => {
  let sink: MemorySink;

  beforeEach(() => {
    process.env.AGENTCRUMBS = "1";
    sink = new MemorySink();
    addSink(sink);
  });

  it("emits expected crumbs", () => {
    const crumb = trail("test");
    crumb("something happened", { key: "value" });

    expect(sink.entries).toHaveLength(1);
    expect(sink.entries[0].msg).toBe("something happened");
    expect(sink.entries[0].data).toEqual({ key: "value" });
  });
});
```

## MemorySink API

```typescript
import { MemorySink } from "agentcrumbs";

const sink = new MemorySink();

// All captured crumbs
sink.entries; // Crumb[]

// Find first matching crumb
sink.find(c => c.msg === "user logged in");

// Filter crumbs
sink.filter(c => c.type === "scope:enter");
sink.filter(c => c.tags?.includes("perf"));

// Wait for a crumb (async, with timeout)
const crumb = await sink.waitFor(
  c => c.type === "scope:exit",
  5000 // timeout in ms, default 5000
);

// Clear all entries
sink.clear();
```

## Core Patterns

### Assert on scope behavior

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

it("wraps operations with scope tracking", async () => {
  process.env.AGENTCRUMBS = "1";
  const sink = new MemorySink();
  addSink(sink);

  const crumb = trail("test");
  const result = await crumb.scope("fetch-user", async (ctx) => {
    ctx.crumb("querying database");
    return { id: "123", name: "Alice" };
  });

  expect(result).toEqual({ id: "123", name: "Alice" });

  const enter = sink.find(c => c.type === "scope:enter" && c.msg === "fetch-user");
  const exit = sink.find(c => c.type === "scope:exit" && c.msg === "fetch-user");
  expect(enter).toBeDefined();
  expect(exit).toBeDefined();
  expect(exit!.data).toHaveProperty("duration");
});
```

### Assert on tags

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

it("tags crumbs correctly", () => {
  process.env.AGENTCRUMBS = "1";
  const sink = new MemorySink();
  addSink(sink);

  const crumb = trail("test");
  crumb("cache miss", { key: "x" }, { tags: ["perf", "cache"] });

  const tagged = sink.filter(c => c.tags?.includes("perf"));
  expect(tagged).toHaveLength(1);
  expect(tagged[0].tags).toEqual(["perf", "cache"]);
});
```

### Test that noop mode produces no output

```typescript
import { trail, addSink, MemorySink, NOOP } from "agentcrumbs";

it("returns NOOP when disabled", () => {
  delete process.env.AGENTCRUMBS;
  const sink = new MemorySink();
  addSink(sink);

  const crumb = trail("test");
  expect(crumb).toBe(NOOP);
  expect(crumb.enabled).toBe(false);

  crumb("should not appear");
  expect(sink.entries).toHaveLength(0);
});
```

## Common Mistakes

### CRITICAL: Not setting AGENTCRUMBS in test environment

Wrong:

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

it("captures crumbs", () => {
  const sink = new MemorySink();
  addSink(sink);

  const crumb = trail("test");
  crumb("hello");
  expect(sink.entries).toHaveLength(1); // FAILS — crumb is NOOP
});
```

Correct:

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

it("captures crumbs", () => {
  process.env.AGENTCRUMBS = "1";
  const sink = new MemorySink();
  addSink(sink);

  const crumb = trail("test");
  crumb("hello");
  expect(sink.entries).toHaveLength(1);
});
```

Without `AGENTCRUMBS` set, `trail()` returns the noop. The noop never calls any sink. Set the env var before creating the trail.

### HIGH: Reusing a MemorySink across tests without clearing

Wrong:

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

const sink = new MemorySink();

it("test 1", () => {
  process.env.AGENTCRUMBS = "1";
  addSink(sink);
  trail("test")("first");
  expect(sink.entries).toHaveLength(1);
});

it("test 2", () => {
  trail("test")("second");
  expect(sink.entries).toHaveLength(1); // FAILS — has 2 entries from both tests
});
```

Correct:

```typescript
import { trail, addSink, MemorySink } from "agentcrumbs";

let sink: MemorySink;

beforeEach(() => {
  process.env.AGENTCRUMBS = "1";
  sink = new MemorySink();
  addSink(sink);
});

it("test 1", () => {
  trail("test")("first");
  expect(sink.entries).toHaveLength(1);
});
```

Create a fresh `MemorySink` in `beforeEach` or call `sink.clear()` between tests. Sinks accumulate entries across all crumbs sent to them.

### MEDIUM: Creating trail before setting the env var

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("test"); // created at module load — AGENTCRUMBS not set yet

it("captures crumbs", () => {
  process.env.AGENTCRUMBS = "1";
  crumb("hello"); // crumb is already NOOP
});
```

Correct:

```typescript
import { trail } from "agentcrumbs";

it("captures crumbs", () => {
  process.env.AGENTCRUMBS = "1";
  const crumb = trail("test"); // created after env var is set
  crumb("hello");
});
```

`trail()` checks the env var at creation time. If you create it at module scope before the test sets `AGENTCRUMBS`, you get a noop that can't be re-enabled. Create trails inside test functions after setting the env var.
