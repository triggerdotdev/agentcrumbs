---
name: agentcrumbs/scopes-and-context
description: >
  Scoped operations, async context propagation, function wrapping, nested
  scopes, traceId tracking, depth indentation, scope enter/exit/error,
  snapshot, assert, wrap. Activate when using crumb.scope(), crumb.wrap(),
  crumb.snapshot(), crumb.assert(), or when debugging async execution
  flow across function boundaries.
type: sub-skill
library: agentcrumbs
library_version: "0.1.0"
requires:
  - agentcrumbs/core
sources:
  - "triggerdotdev/trigger-labs:debug-mode/src/trail.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/context.ts"
  - "triggerdotdev/trigger-labs:debug-mode/README.md"
---

# agentcrumbs — Scopes and Context

This skill builds on agentcrumbs/core. Read it first for foundational concepts.

## Core Patterns

### Wrap operations with automatic enter/exit/error tracking

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("auth-service"); // @crumbs

// #region @crumbs
const user = await crumb.scope("validate-token", async (ctx) => {
  ctx.crumb("checking jwt", { tokenPrefix: token.slice(0, 8) });
  const result = await verifyToken(token);
  ctx.crumb("token valid", { userId: result.id });
  return result;
});
// #endregion @crumbs
// Emits: scope:enter -> crumb -> crumb -> scope:exit (with duration)
// If verifyToken throws: scope:enter -> crumb -> scope:error (with error details)
```

The scope callback receives `ctx` with `ctx.crumb` (a child trail) and `ctx.traceId` (unique ID for this scope). The return value passes through.

### Nest scopes for hierarchical tracing

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("order-service"); // @crumbs

// #region @crumbs
await crumb.scope("process-order", async (ctx) => {
  ctx.crumb("validating items", { count: order.items.length });

  await ctx.crumb.scope("charge-payment", async (inner) => {
    inner.crumb("calling payment API");
    await chargeCard(order.payment);
    inner.crumb("payment confirmed");
  });

  ctx.crumb("sending confirmation email");
});
// #endregion @crumbs
```

Output shows indented depth:

```
order-service [process-order] -> enter     +0ms
order-service   validating items           +1ms
order-service   [charge-payment] -> enter  +0ms
order-service     calling payment API      +0ms
order-service     payment confirmed        +15ms
order-service   [charge-payment] <- exit   +15ms
order-service   sending confirmation email +0ms
order-service [process-order] <- exit      +16ms
```

### Wrap existing functions with scope tracking

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("api"); // @crumbs

const trackedFetch = crumb.wrap("fetch", fetch); // @crumbs
const response = await trackedFetch("https://api.example.com/users");
// Automatically emits scope:enter and scope:exit with duration
```

### Capture state snapshots and debug assertions

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("processor"); // @crumbs

// #region @crumbs
crumb.snapshot("state-before", complexObject);
// #endregion @crumbs
mutate(complexObject);
// #region @crumbs
crumb.snapshot("state-after", complexObject);
crumb.assert(user != null, "user should exist after auth");
crumb.assert(items.length > 0, "cart should not be empty at checkout");
// #endregion @crumbs
```

## Context Propagation

Scopes use `AsyncLocalStorage` internally. Context (traceId, depth, session) propagates automatically through async boundaries — no manual threading required.

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

await crumb.scope("request", async (ctx) => {
  // traceId propagates into nested async calls
  await processItems(ctx.crumb);
});

async function processItems(crumb: TrailFunction) {
  // This scope inherits the parent's traceId and depth
  await crumb.scope("process-batch", async (ctx) => {
    ctx.crumb("processing");
  });
}
```

## Common Mistakes

### HIGH: Ignoring the scope return value

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

crumb.scope("fetch-user", async (ctx) => {
  const user = await getUser(id);
  ctx.crumb("got user", { userId: user.id });
  return user;
});
// user is lost — scope returns a Promise<User> that is not awaited
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

const user = await crumb.scope("fetch-user", async (ctx) => {
  const user = await getUser(id);
  ctx.crumb("got user", { userId: user.id });
  return user;
});
```

`scope()` returns the callback's return value (or a Promise wrapping it for async callbacks). Forgetting to capture or await it loses the result.

### HIGH: Using the parent crumb inside a scope instead of ctx.crumb

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

crumb.scope("operation", (ctx) => {
  crumb("inside scope"); // uses parent, not scoped crumb
});
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

crumb.scope("operation", (ctx) => {
  ctx.crumb("inside scope"); // uses scoped crumb with correct depth/traceId
});
```

Using the parent `crumb` instead of `ctx.crumb` inside a scope bypasses depth tracking and traceId propagation. The crumb will appear at the wrong indentation level and won't be linked to the scope's trace.

### MEDIUM: Wrapping functions that return non-Promise thenables

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

// Custom thenable objects are detected as Promises
const wrapped = crumb.wrap("customAsync", myCustomThenable);
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

const wrapped = crumb.wrap("customAsync", (...args) => {
  return Promise.resolve(myCustomThenable(...args));
});
```

`scope()` uses `instanceof Promise` to detect async results. Custom thenables that are not actual Promise instances will have their scope exit emitted synchronously before the operation completes. Wrap them in `Promise.resolve()` if you need proper async scope tracking.
