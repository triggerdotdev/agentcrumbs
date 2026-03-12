# agentcrumbs

AI agents can read your code but they can't see what happened at runtime. agentcrumbs fixes that. Agents drop structured traces inline as they write code. When something breaks, the agent queries those traces and sees exactly what ran, with what data, in what order.

Crumbs are development-only. They get stripped before merge and cost nothing when disabled.

```
Service A ──┐                                ┌── $ agentcrumbs tail
Service B ──┤── fetch() ──> Collector :8374 ──┤── $ agentcrumbs query --since 5m
Service C ──┘  (fire & forget)               └── ~/.agentcrumbs/<app>/crumbs.jsonl
```

## Getting started

```bash
npm install agentcrumbs
```

Then tell your agent: **"Run `npx @tanstack/intent@latest install` to set up agentcrumbs skills, then run the agentcrumbs/init skill."**

The agent will wire the skills into your agent config (CLAUDE.md, .cursorrules, etc.), then scan your repo to build a namespace catalog so all agents use consistent names.

## Agent skills

agentcrumbs ships with [@tanstack/intent](https://tanstack.com/blog/from-docs-to-agents) skills inside the npm package. When your agent runs `npx @tanstack/intent install`, it sets up skill-to-task mappings in your agent config so it knows when to load agentcrumbs patterns.

| Skill | What it teaches |
| --- | --- |
| `agentcrumbs` | Core workflow, API, markers, CLI reference, common mistakes |
| `agentcrumbs/init` | Scans repo, discovers namespaces, writes config |

Skills travel with the package version. The agent always has docs matching the installed code.

## How it works

The agent writes crumbs as part of the code it's implementing:

```typescript
import { trail } from "agentcrumbs"; // @crumbs
const crumb = trail("auth-service"); // @crumbs

export async function handleLogin(token: string) {
  crumb("login attempt", { tokenPrefix: token.slice(0, 8) }); // @crumbs

  const user = await validateToken(token);

  crumb("login success", { userId: user.id }); // @crumbs
  return user;
}
```

When something goes wrong, the agent starts the collector and queries the trail:

```bash
agentcrumbs collect --quiet &
AGENTCRUMBS=1 node app.js
agentcrumbs query --since 5m
```

```
auth-service  login attempt       +0ms  { tokenPrefix: "eyJhbGci" }
auth-service  token decode ok     +3ms  { userId: "u_8f3k" }
auth-service  permissions check   +8ms  { roles: [] }
auth-service  rejected: no roles  +8ms  { status: 401 }

4 crumbs.
```

Now the agent knows: the token is valid, but the user has no roles. The fix is in role assignment, not token validation.

## Workflow

Crumbs live on your feature branch. They never ship to main.

1. **Agent writes code with crumbs.** As it implements a feature, it drops crumbs at every decision point.
2. **Something breaks.** The agent starts the collector, re-runs the failing code with `AGENTCRUMBS=1`, and queries the trail.
3. **Agent reads the trail.** It sees what actually executed, in what order, with what data. Fixes the root cause instead of guessing.
4. **Strip before merge.** `agentcrumbs strip` removes all crumb code. Clean diff, clean main.
5. **CI enforces it.** `agentcrumbs strip --check` exits 1 if any `@crumbs` markers are found.

## The noop guarantee

When a namespace is disabled, `trail()` returns a pre-built frozen noop function. There is no `if (enabled)` check on every call. The function itself is the noop.

The only cost is the function call itself, which V8 will likely inline after warmup. For hot paths with expensive arguments, gate on `crumb.enabled`.

## API overview

All methods are documented in detail at [agentcrumbs.dev/docs/api](https://agentcrumbs.dev/docs/api).

| Method | Purpose |
| --- | --- |
| `configure(config)` | Enable tracing in the browser (no-op in Node.js) |
| `trail(namespace)` | Create a trail function for a namespace |
| `crumb(msg, data?, options?)` | Drop a crumb with message and optional data |
| `crumb.scope(name, fn)` | Wrap a function with entry/exit/error tracking |
| `crumb.child(context)` | Create a child trail with inherited context |
| `crumb.wrap(name, fn)` | Wrap any function with automatic scope tracking |
| `crumb.time(label)` / `crumb.timeEnd(label)` | Measure operation duration |
| `crumb.snapshot(label, obj)` | Capture a point-in-time deep clone |
| `crumb.assert(condition, msg)` | Debug-only assertion (emits crumb, never throws) |
| `crumb.session(name)` | Group crumbs into logical sessions |

## Crumb markers

Mark crumb lines with `// @crumbs` (single line) or `// #region @crumbs` / `// #endregion @crumbs` (block) so they can be stripped before merge. See the [markers docs](https://agentcrumbs.dev/docs/markers) for details and examples.

## Configuration

In Node.js, everything is controlled by a single `AGENTCRUMBS` environment variable. In the browser, use `configure()`:

```typescript
import { configure } from "agentcrumbs"; // @crumbs
configure("*"); // @crumbs — enable all namespaces
```

### Environment variable (Node.js)

| Value | Effect |
| --- | --- |
| `1`, `*`, `true` | Enable all namespaces |
| `auth-service` | Exact namespace match |
| `auth-*` | Wildcard match |
| `auth-*,api-*` | Multiple patterns (comma or space separated) |
| `* -internal-*` | Match all except excluded patterns |
| `{"ns":"*","port":9999}` | JSON config with full control |
| `{"app":"my-app","ns":"*"}` | Explicit app name |

JSON config fields: `app` (app name, default auto-detect from package.json), `ns` (namespace filter, required), `port` (collector port, default 8374), `format` (`"pretty"` or `"json"`, default `"pretty"`).

You can also set `AGENTCRUMBS_APP` to override the app name independently.

## CLI

Common commands for reference. Run `agentcrumbs --help` for the full list.

```bash
# Collector
agentcrumbs collect --quiet &        # Start in background
agentcrumbs collect --port 9999      # Custom port

# Live tail
agentcrumbs tail                     # All namespaces (scoped to current app)
agentcrumbs tail --ns auth-service   # Filter by namespace
agentcrumbs tail --app my-app        # Tail a specific app
agentcrumbs tail --all-apps          # Tail all apps

# Query (paginated, 50 per page)
agentcrumbs query --since 5m         # Last 5 minutes
agentcrumbs query --since 5m --cursor a1b2c3d4  # Next page
agentcrumbs query --since 1h --limit 25          # Smaller pages
agentcrumbs query --session a1b2c3   # Filter by session
agentcrumbs query --tag root-cause   # Filter by tag

# Strip
agentcrumbs strip --dry-run          # Preview removals
agentcrumbs strip                    # Remove all crumb code
agentcrumbs strip --check            # CI gate (exits 1 if markers found)

# Utilities
agentcrumbs stats                    # Crumb counts (current app)
agentcrumbs stats --all-apps         # Stats for all apps
agentcrumbs clear                    # Clear crumbs (current app)
```

Time units: `s` (seconds), `m` (minutes), `h` (hours), `d` (days).

## Multi-service architecture

All services write to the same collector. `agentcrumbs tail` shows interleaved output with namespace-colored labels. See the [multi-service docs](https://agentcrumbs.dev/docs/multi-service) for setup patterns.

## Cross-language compatibility

The collector is language-agnostic. Any language with HTTP support can send crumbs:

```bash
curl -X POST http://localhost:8374/crumb \
  -H "Content-Type: application/json" \
  -d '{"app":"my-app","ts":"2026-01-01T00:00:00Z","ns":"shell","msg":"hello","type":"crumb","dt":0,"pid":1}'
```

## Runtime compatibility

Zero runtime dependencies.

- **Node.js 18+** and **Bun** — uses `node:async_hooks`, `node:crypto`, `node:fs`, `node:util`
- **Browsers** — Vite, webpack, esbuild, Next.js auto-resolve to the browser build via the `"browser"` export condition. Same `"agentcrumbs"` import path. Use `configure()` instead of the env var to enable tracing. See the [browser guide](https://agentcrumbs.dev/docs/guides/browser).

## Docs

Full documentation at [agentcrumbs.dev/docs](https://agentcrumbs.dev/docs).

## License

MIT
