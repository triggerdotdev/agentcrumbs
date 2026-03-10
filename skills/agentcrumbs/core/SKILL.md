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

# agentcrumbs — Core Patterns

Setup: `import { trail } from "agentcrumbs"; // @crumbs` then `const crumb = trail("ns"); // @crumbs`

Markers: single-line `// @crumbs` | block `// #region @crumbs` ... `// #endregion @crumbs`

## Patterns

```typescript
crumb("token validated", { userId: "u_123", expiresIn: 3600 }); // @crumbs
crumb("cache miss", { key }, { tags: ["perf", "cache"] }); // @crumbs
const reqCrumb = crumb.child({ requestId: req.id }); // @crumbs — inherited context
crumb.time("op"); /* ... */ crumb.timeEnd("op", { rows }); // @crumbs — timing
if (crumb.enabled) { crumb("dump", { state: structuredClone(big) }); } // @crumbs — guard expensive args
```

## Noop Guarantee

When disabled, `trail()` returns a frozen noop. No per-call check. `crumb.child()` returns same noop. `crumb.scope("op", fn)` calls `fn()` directly. `crumb.wrap("name", fn)` returns original `fn`.

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
