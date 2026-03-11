---
name: agentcrumbs
description: >
  Debug mode for AI coding agents. Drop structured traces inline while writing
  code, query them when something breaks, strip before merge. Covers the core
  workflow: trail, crumb, markers, collector, query, strip. Activate when using
  agentcrumbs, adding debug tracing, or when an agent needs to understand
  runtime behavior.
type: core
library: agentcrumbs
library_version: "0.2.0"
sources:
  - "triggerdotdev/trigger-labs:debug-mode/README.md"
  - "triggerdotdev/trigger-labs:debug-mode/src/trail.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/types.ts"
---

# agentcrumbs

Structured debug traces that agents drop inline while writing code, then query when something breaks. Stripped before merge, zero cost when off.

## Workflow

```
1. Write code + crumbs   →  crumb("user verified", { userId }); // @crumbs
2. Run with collector     →  agentcrumbs collect & AGENTCRUMBS=1 node app.js
3. Something breaks       →  agentcrumbs query --since 5m
4. Fix the bug            →  (read the trail, find the cause, fix it)
5. Strip before merge     →  agentcrumbs strip
```

## Core API

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("my-service"); // @crumbs — create once at module level

// Basic crumb
crumb("checkout started", { cartId: "c_91" }); // @crumbs

// With tags (third arg) for filtering
crumb("cache miss", { key }, { tags: ["perf"] }); // @crumbs

// Child context for per-request tracing
const reqCrumb = crumb.child({ requestId: req.id }); // @crumbs
reqCrumb("handling request", { path: req.url }); // @crumbs

// Scoped operations with automatic enter/exit/error tracking
const user = await crumb.scope("validate-token", async (ctx) => { // @crumbs
  ctx.crumb("checking jwt"); // @crumbs
  return await verifyToken(token); // @crumbs
}); // @crumbs

// Guard expensive args
if (crumb.enabled) { crumb("dump", { state: structuredClone(big) }); } // @crumbs
```

## Markers

Every crumb line needs a marker so `agentcrumbs strip` can remove it before merge.

```typescript
// Single-line marker
crumb("event", { data }); // @crumbs

// Block marker for multi-line sections
// #region @crumbs
const result = await crumb.scope("operation", async (ctx) => {
  ctx.crumb("step 1");
  ctx.crumb("step 2");
  return value;
});
// #endregion @crumbs
```

**Unmarked crumbs will leak into production code.** The strip command only removes lines with `// @crumbs` or code inside `#region @crumbs` blocks.

## CLI quick reference

```bash
agentcrumbs collect           # Start HTTP collector (required for query/tail)
agentcrumbs tail              # Live tail (auto-scoped to current app)
agentcrumbs tail --app foo    # Tail a specific app
agentcrumbs tail --all-apps   # Tail all apps
agentcrumbs query --since 5m  # Query history (--ns, --tag, --session, --json)
agentcrumbs clear             # Clear crumbs for current app
agentcrumbs clear --all-apps  # Clear crumbs for all apps
agentcrumbs strip             # Remove all crumb markers from source
agentcrumbs strip --check     # CI gate — exits 1 if markers found
agentcrumbs --help            # Full command reference
```

Most commands accept `--app <name>` and `--all-apps`. Default is auto-detect from `package.json`.

Run `agentcrumbs <command> --help` for detailed options on any command.

## Enable tracing

```bash
AGENTCRUMBS=1 node app.js              # Enable all namespaces
AGENTCRUMBS='{"ns":"auth-*"}' node app.js  # Filter by namespace
```

When `AGENTCRUMBS` is not set, `trail()` returns a frozen noop. No conditionals, no overhead.

## App isolation

Every crumb is stamped with an `app` name. This keeps crumbs from different projects separate — storage, CLI queries, and tail all scope to the current app by default.

**App name resolution** (first match wins):
1. `app` field in `AGENTCRUMBS` JSON config: `AGENTCRUMBS='{"app":"my-app","ns":"*"}'`
2. `AGENTCRUMBS_APP` env var
3. Auto-detected from the nearest `package.json` name field

Crumbs are stored per-app at `~/.agentcrumbs/<app>/crumbs.jsonl`.

```bash
agentcrumbs tail                 # Scoped to current app (auto-detected)
agentcrumbs tail --app my-app    # Scope to a specific app
agentcrumbs tail --all-apps      # See crumbs from all apps
agentcrumbs stats --all-apps     # Per-app statistics
```

## Critical mistakes

1. **Missing markers** — Every crumb line needs `// @crumbs` or a `#region @crumbs` block. Without them, `strip` can't clean up.
2. **Creating trail() in hot paths** — `trail()` parses the env var each call. Create once at module scope, use `child()` for per-request context.
3. **No collector running** — Without `agentcrumbs collect`, crumbs go to stderr only and can't be queried. Start the collector before reproducing issues.

## Further discovery

- **CLI details**: `agentcrumbs --help` and `agentcrumbs <command> --help`
- **TypeScript types**: Check the type definitions in `node_modules/agentcrumbs/dist/index.d.ts`
- **Docs**: https://agentcrumbs.dev/docs
- **Sessions and tags**: `crumb.session()` for grouping, `{ tags: [...] }` as third arg for filtering
- **Testing**: `import { MemorySink, addSink } from "agentcrumbs"` to capture crumbs in tests
- **Scopes**: `crumb.scope()`, `crumb.wrap()`, `crumb.snapshot()`, `crumb.assert()` for structured tracing
