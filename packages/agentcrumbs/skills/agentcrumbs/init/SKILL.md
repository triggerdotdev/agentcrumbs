---
name: agentcrumbs/init
description: >
  Initialize agentcrumbs in a repository. Discover systems, services, and
  modules to build a namespace catalog, then write the catalog to CLAUDE.md
  or AGENTS.md. Activate when setting up agentcrumbs in a new project,
  when asked to "init crumbs", "set up debug tracing", "add agentcrumbs",
  or when the project has agentcrumbs as a dependency but no namespace
  catalog in its agent config files.
type: lifecycle
library: agentcrumbs
library_version: "0.2.0"
requires:
  - agentcrumbs
sources:
  - "triggerdotdev/trigger-labs:debug-mode/README.md"
  - "triggerdotdev/trigger-labs:debug-mode/src/types.ts"
---

# Initialize agentcrumbs in a Repository

You are setting up agentcrumbs debug tracing in a repository. Your job is
to discover the project's systems and services, build a namespace catalog,
and write it into the project's agent config file (CLAUDE.md or AGENTS.md)
so all agents use consistent namespaces.

The output should be minimal — just the namespace catalog, a one-liner
about the strip workflow, and essential CLI. The agentcrumbs skills
already teach agents HOW to use the library. The config file only needs
to teach agents WHICH namespaces to use in THIS repo.

---

## Phase 1 — Discover project structure

Scan the repository to identify logical systems, services, and modules.
These become the namespace catalog.

### What to scan

Search for system boundaries using these strategies in order. Stop when
you have a reasonable set (typically 3–15 namespaces):

**Monorepo packages:**
- `apps/` directories — each app is a namespace
- `packages/` directories — each package is a namespace
- `internal-packages/` directories — each is a namespace
- `services/` directories — each service is a namespace

**Single-repo modules:**
- `src/` top-level directories — each major module is a namespace
- Route groups, feature folders, domain directories

**Existing conventions:**
- Look for existing logger namespaces, OpenTelemetry service names
- Check `package.json` name fields for naming conventions

**Framework-specific:**
- Next.js: `app/api/*` route groups, server actions, middleware
- Express/Fastify: router modules, middleware groups
- Worker/queue systems: each worker type

### Naming rules

- Use lowercase kebab-case: `auth-service`, `api-gateway`, `task-runner`
- Keep names short but descriptive: `webapp` not `main-web-application`
- Match existing conventions in the repo if they exist
- Group related subsystems with prefixes: `db-queries`, `db-migrations`

### Determine the app name

The app name identifies this project in crumb storage and CLI filtering.
Read the root `package.json` `name` field (strip any `@scope/` prefix).
This is what gets stamped on every crumb as the `app` field.

If the repo is a monorepo, use the root package name (not individual
workspace packages — those become namespaces, not apps).

### Browser apps

If the project has browser-side code (React, Vue, Svelte, etc.), include
browser-facing namespaces in the catalog. The same `"agentcrumbs"` import
works in the browser — bundlers auto-resolve to the browser build. Note
in the config that browser apps use `configure()` instead of the env var.

### What to capture for each namespace

For each namespace, record:
- **name**: the trail namespace string
- **description**: one-line description of what this system does
- **path**: directory path relative to repo root (if applicable)

---

## Phase 2 — Ask the maintainer

Present the app name and discovered namespaces to the maintainer and ask:

1. "The app name is `<name>` (from package.json). Is that correct?"
2. "Here are the namespaces I found. Should I add, remove, or rename any?"
3. "Are there any cross-cutting concerns I should add?" (e.g., `cron`,
   `migrations`, `external-api`, `auth`, `billing`)
4. "Which agent config file should I write to — CLAUDE.md or AGENTS.md?"

Wait for their response before proceeding.

If the maintainer asks to skip this phase, explain that the namespace
catalog is the most important part — it ensures all agents use consistent
names. Proceed only if they confirm a second time.

---

## Phase 3 — Write the config

Write (or append to) the agent config file. Keep it short. The skills
handle usage details — the config file only needs repo-specific context.

The output should look like this:

````markdown
## agentcrumbs

App: `my-project`

Add crumbs as you write code — not just when debugging. Mark lines with
`// @crumbs` or wrap blocks in `// #region @crumbs`. They stay on the
branch throughout development and are stripped by `agentcrumbs strip`
before merge.

### Namespaces

| Namespace | Description | Path |
| --- | --- | --- |
| `webapp` | Main web application and API | `apps/webapp` |
| `supervisor` | Task execution supervisor | `apps/supervisor` |
| `core` | Shared types and utilities | `packages/core` |
| `billing` | Billing and subscription logic | `apps/webapp/app/services/billing` |

Do not invent new namespaces — pick from this table or ask first.

### For PR reviewers

Do not flag `// @crumbs` markers, `#region @crumbs` blocks, or agentcrumbs
imports in reviews. These are temporary debug instrumentation stripped
before merge. Data logged in crumbs (IDs, names, values) never reaches
production.

### CLI

```bash
AGENTCRUMBS=1 node app.js              # enable tracing (Node.js)
configure("*")                          # enable tracing (browser — call before trail())
agentcrumbs collect                     # start collector
agentcrumbs tail                        # live tail (scoped to this app)
agentcrumbs query --since 5m            # query recent crumbs (all namespaces)
agentcrumbs query --since 5m --cursor <id>  # paginate (cursor from output)
agentcrumbs clear                       # clear crumbs for this app
agentcrumbs strip                       # remove crumbs before merge
```

When querying, always start broad (all namespaces) and paginate with `--cursor`. Do not filter by `--ns` or `--match` — the value is in seeing the full cross-service picture.
````

Adapt the example above to the actual discovered namespaces and app name.
Drop the Path column if namespaces don't have meaningful directory paths.
Replace `my-project` with the actual app name detected from `package.json`.

---

## Phase 4 — Verify

After writing the file:

1. Read it back and verify the namespace table rendered correctly
2. Check there are no duplicate `## agentcrumbs` sections
3. Tell the maintainer what you wrote and where

---

## Constraints

| Rule | Detail |
|------|--------|
| Never invent namespaces without discovery | Scan the repo first, always |
| Namespace catalog is mandatory | The whole point is consistent naming |
| Ask before writing | Confirm namespaces and target file |
| Append, don't overwrite | If the file exists, append to it |
| Skip if already configured | If the file contains `## agentcrumbs`, tell the user and stop |
| Use repo conventions | Match existing naming style (kebab-case, camelCase, etc.) |
| Keep it short | No usage tutorial — the skills cover that. Just the catalog and 3-line CLI reference |
| No redundancy with skills | Don't repeat API docs, marker syntax details, env var schemas, or scope/session usage |
