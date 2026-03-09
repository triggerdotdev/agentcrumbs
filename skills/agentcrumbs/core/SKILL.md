---
name: agentcrumbs/core
description: >
  Core debug tracing with agentcrumbs: trail(), crumb(), @crumbs markers,
  #region @crumbs blocks, agentcrumbs strip, env var config, noop strategy,
  structured data, child context, AGENTCRUMBS environment variable,
  namespace filtering, zero-overhead disabled instrumentation. Activate
  when importing agentcrumbs, setting up debug tracing, creating trail
  functions, adding crumb markers, or stripping crumbs before merge.
type: core
library: agentcrumbs
library_version: "0.1.0"
sources:
  - "triggerdotdev/trigger-labs:debug-mode/src/trail.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/env.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/noop.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/types.ts"
  - "triggerdotdev/trigger-labs:debug-mode/README.md"
---

# agentcrumbs — Core Debug Tracing

agentcrumbs is a zero-overhead debug tracing library. When `AGENTCRUMBS`
is unset, every call is a frozen noop. When enabled, structured events
flow to a collector or stderr.

## Workflow

**Add crumbs as you write code, not after.** When you're building a new
feature, implementing a fix, or writing any code — drop crumbs inline as
part of the work. Don't wait until something breaks to add tracing. Treat
crumbs as part of writing the code itself, like writing a test alongside
the implementation. Every function you write, every branch you add, every
API call you make — add a crumb. Assume debugging will happen later and
your future self will thank you for the visibility.

Crumbs live on the feature branch throughout the PR lifecycle. They are
stripped by `agentcrumbs strip` right before the PR is merged. They never
ship to main. They cost nothing to add and everything to not have when
you need them.

**You can also add crumbs directly to files in `node_modules/`.** This
is useful for tracing into library internals — understanding what a
dependency is actually doing, what arguments it receives, what it returns.
No `// @crumbs` markers needed (gitignored). No import needed either —
just paste a raw `fetch()` call:

```javascript
fetch("http://localhost:8374/crumb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ts: new Date().toISOString(), ns: "library-name", msg: "what is happening", type: "crumb", dt: 0, pid: process.pid, data: { relevantVar } }) }).catch(() => {});
```

A fresh `npm install` resets everything.

When reviewing PRs: do not flag `// @crumbs` markers, `#region @crumbs`
blocks, or data logged in crumbs. These are temporary and will be removed
pre-merge.

## Setup

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("my-service"); // @crumbs

crumb("user logged in", { userId: "123", method: "oauth" }); // @crumbs
```

Enable with the `AGENTCRUMBS` env var, strip before merge:

```bash
AGENTCRUMBS=1 node app.js
agentcrumbs strip        # remove all marked crumb code before merge
agentcrumbs strip --check  # CI gate — fails if markers found
```

## Crumb Markers

**Every crumb line must be marked** so `agentcrumbs strip` can remove it.

Single-line: append `// @crumbs` to any crumb line:

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("auth-service"); // @crumbs
crumb("checkpoint", { step: 1 }); // @crumbs
```

Block: wrap multi-line crumb code in `#region @crumbs` (collapsible in editors):

```typescript
// #region @crumbs
const session = crumb.session("debug-flow");
session.crumb("step 1", { data });
session.crumb("step 2", { moreData });
session.end();
// #endregion @crumbs
```

## Core Patterns

### Drop a crumb with structured data and tags

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("auth-service"); // @crumbs

crumb("token validated", { userId: "u_123", expiresIn: 3600 }); // @crumbs
crumb("cache miss", { key: "users:123" }, { tags: ["perf", "cache"] }); // @crumbs
```

### Create child trails with inherited context

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("api-gateway"); // @crumbs

function handleRequest(req: Request) {
  const reqCrumb = crumb.child({ requestId: req.id, path: req.url }); // @crumbs
  reqCrumb("handling request"); // @crumbs

  const dbCrumb = reqCrumb.child({ database: "primary" }); // @crumbs
  dbCrumb("executing query", { sql: "SELECT ..." }); // @crumbs
}
```

### Measure timing with block markers

```typescript
function processOrder(order: Order) {
  // #region @crumbs
  crumb.time("process-order");
  // #endregion @crumbs

  const result = chargePayment(order);

  // #region @crumbs
  crumb.timeEnd("process-order", { amount: result.amount });
  // #endregion @crumbs

  return result;
}
```

### Guard expensive debug arguments

```typescript
// #region @crumbs
if (crumb.enabled) {
  crumb("full state dump", { state: structuredClone(largeObject) });
}
// #endregion @crumbs
```

## AGENTCRUMBS Environment Variable

A single env var controls everything. Non-JSON values are shorthand:

| Value | Effect |
|-------|--------|
| `1`, `*`, `true` | Enable all namespaces |
| `auth-*` | Enable matching namespaces (raw string treated as filter) |
| `{"ns":"auth-*,api-*"}` | JSON config with namespace filter |
| `{"ns":"* -internal-*"}` | Wildcard with exclusions |
| `{"ns":"*","port":9999}` | Custom collector port |
| `{"ns":"*","format":"json"}` | JSON output to stderr |
| (unset) | Disabled — all calls are noop |

## The Noop Guarantee

When `trail()` is called and the namespace is disabled, it returns a pre-frozen noop function. There is no per-call `if (enabled)` check. The function body is empty.

```typescript
// When AGENTCRUMBS is unset:
const crumb = trail("my-service"); // returns frozen NOOP
crumb("msg", { data });            // empty function, returns undefined
crumb.child({ x: 1 });             // returns same NOOP
crumb.scope("op", fn);             // calls fn() directly
crumb.wrap("name", fn);            // returns original fn
```

The noop check happens once at `trail()` creation time, not on every call.

## Common Mistakes

### CRITICAL: Checking enabled on every call instead of using the noop

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("my-service");

function handleRequest(req: Request) {
  if (process.env.AGENTCRUMBS) {
    crumb("handling request", { path: req.url });
  }
}
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("my-service");

function handleRequest(req: Request) {
  crumb("handling request", { path: req.url });
}
```

The `trail()` function already returns a noop when disabled. Adding manual checks defeats the zero-overhead design and adds unnecessary conditionals to every call site.

### HIGH: Creating trail inside hot loops or request handlers

Wrong:

```typescript
import { trail } from "agentcrumbs";

function handleRequest(req: Request) {
  const crumb = trail("api"); // new trail on every request
  crumb("handling", { path: req.url });
}
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("api"); // created once at module level

function handleRequest(req: Request) {
  const reqCrumb = crumb.child({ requestId: req.id });
  reqCrumb("handling", { path: req.url });
}
```

`trail()` reads and parses the env var on each call. Create it once at module scope and use `child()` for per-request context.

### HIGH: Passing expensive arguments without checking enabled

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("processor");

// structuredClone runs even when disabled
crumb("state snapshot", { state: structuredClone(hugeObject) });
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("processor");

if (crumb.enabled) {
  crumb("state snapshot", { state: structuredClone(hugeObject) });
}
```

JavaScript evaluates all arguments before calling the function. For cheap data like `{ userId }`, this is negligible. For expensive operations like `structuredClone` or `JSON.stringify` on large objects, guard with `crumb.enabled`.

### HIGH: Adding crumbs without markers

Wrong:

```typescript
import { trail } from "agentcrumbs";
const crumb = trail("service");

crumb("debugging this issue", { data });
```

Correct:

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("service"); // @crumbs

crumb("debugging this issue", { data }); // @crumbs
```

Every crumb line needs a `// @crumbs` marker (or be inside a `#region @crumbs` block). Without markers, `agentcrumbs strip` can't find and remove the code before merge. Unmarked crumbs will leak into production code.

### MEDIUM: Using wrong env var name

Wrong:

```bash
DEBUG=* node app.js
CRUMBS=1 node app.js
```

Correct:

```bash
AGENTCRUMBS=1 node app.js
AGENTCRUMBS='{"ns":"*"}' node app.js
```

The env var is `AGENTCRUMBS`, not `DEBUG` or `CRUMBS`. The JSON config uses `ns` for namespace filter, not `namespace` or `debug`.
