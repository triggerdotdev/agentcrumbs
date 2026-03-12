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
agentcrumbs query --since 5m  # Query last 5 minutes (all namespaces, 50 per page)
agentcrumbs query --since 5m --cursor <id>  # Next page (cursor from output)
agentcrumbs clear             # Clear crumbs for current app
agentcrumbs clear --all-apps  # Clear crumbs for all apps
agentcrumbs strip             # Remove all crumb markers from source
agentcrumbs strip --check     # CI gate — exits 1 if markers found
agentcrumbs --help            # Full command reference
```

Most commands accept `--app <name>` and `--all-apps`. Default is auto-detect from `package.json`.

## Querying crumbs

**IMPORTANT: Query broadly, paginate — don't filter narrowly.** The value of crumbs is seeing what happened across ALL services, not just one. Filtering to a single namespace or adding match filters defeats the purpose — you'll miss the cross-service interactions that reveal the real bug.

The right approach:
1. Query a time window with no namespace filter
2. Read the first page of results
3. Use `--cursor` to paginate forward if you need more

```bash
# CORRECT: broad query, paginate through results
agentcrumbs query --since 5m
agentcrumbs query --since 5m --cursor a1b2c3d4   # cursor from previous output

# CORRECT: narrow the time window, not the namespaces
agentcrumbs query --after 2026-03-11T14:00:00Z --before 2026-03-11T14:01:00Z

# CORRECT: smaller pages to save context
agentcrumbs query --since 5m --limit 25

# CORRECT: filter by session (still shows all namespaces in that session)
agentcrumbs query --session a1b2c3

# AVOID: don't filter to one namespace unless you already know the root cause
# agentcrumbs query --since 5m --ns auth-service     # too narrow!
# agentcrumbs query --since 5m --match "userId:123"   # too narrow!
```

Results are paginated (50 per page by default). When there are more results, the output includes a short `--cursor` ID for the next page.

Run `agentcrumbs <command> --help` for detailed options on any command.

## Enable tracing

**Node.js:** Set the `AGENTCRUMBS` environment variable:

```bash
AGENTCRUMBS=1 node app.js              # Enable all namespaces
AGENTCRUMBS='{"ns":"auth-*"}' node app.js  # Filter by namespace
```

**Browser:** Use `configure()` instead (no env vars in browsers):

```typescript
import { configure, trail } from "agentcrumbs"; // @crumbs
configure("*"); // @crumbs — enable all namespaces
const crumb = trail("ui"); // @crumbs
```

Bundlers (Vite, webpack, esbuild, Next.js) auto-resolve to the browser build. Same import path.

When tracing is not enabled, `trail()` returns a frozen noop. No conditionals, no overhead.

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

1. **Over-filtering queries** — Do NOT add `--ns` or `--match` filters to narrow results. Use `--limit` and `--cursor` to paginate instead. Filtering to one namespace hides cross-service bugs. If there are too many results, narrow the time window or reduce `--limit`, not the namespaces.
2. **Missing markers** — Every crumb line needs `// @crumbs` or a `#region @crumbs` block. Without them, `strip` can't clean up.
3. **Creating trail() in hot paths** — `trail()` parses config each call. Create once at module scope, use `child()` for per-request context.
4. **Forgetting configure() in the browser** — In browser apps, call `configure("*")` before any `trail()` calls. Without it, all namespaces are disabled.
4. **No collector running** — Without `agentcrumbs collect`, crumbs go to stderr only and can't be queried. Start the collector before reproducing issues.

## Further discovery

- **CLI details**: `agentcrumbs --help` and `agentcrumbs <command> --help`
- **TypeScript types**: Check the type definitions in `node_modules/agentcrumbs/dist/index.d.ts`
- **Docs**: https://agentcrumbs.dev/docs
- **Sessions and tags**: `crumb.session()` for grouping, `{ tags: [...] }` as third arg for filtering
- **Testing**: `import { MemorySink, addSink } from "agentcrumbs"` to capture crumbs in tests
- **Scopes**: `crumb.scope()`, `crumb.wrap()`, `crumb.snapshot()`, `crumb.assert()` for structured tracing
