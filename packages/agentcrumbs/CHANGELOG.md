# agentcrumbs

## 0.4.0

### Minor Changes

- ca4aace: Add app concept for project-level crumb isolation and cursor-based query pagination.

  **App isolation:**

  - Every crumb is stamped with an `app` name, auto-detected from the nearest `package.json`
  - Crumbs stored per-app at `~/.agentcrumbs/<app>/crumbs.jsonl`
  - Collector routes incoming crumbs to per-app stores
  - All CLI commands scope to the current app by default
  - Override with `--app <name>`, `--all-apps`, `AGENTCRUMBS_APP` env var, or `app` field in JSON config

  **Query pagination:**

  - New `--cursor` flag for forward pagination with short 8-char cursor IDs
  - New `--after` and `--before` flags for absolute ISO timestamp windows
  - Default limit reduced from 100 to 50 per page
  - Results returned oldest-first with `Next: --cursor <id>` in output when more pages exist

  **New files:**

  - `src/cli/app-store.ts` — shared helper for app context resolution across CLI commands
  - `src/cli/cursor.ts` — cursor storage with 1-hour TTL

  **Breaking changes:**

  - `Crumb` type now has a required `app: string` field
  - `AgentCrumbsConfig` type now has an optional `app?: string` field
  - `CollectorServer` no longer exposes `getStore()` (routes to per-app stores internally)
  - Storage location changed from `~/.agentcrumbs/crumbs.jsonl` to `~/.agentcrumbs/<app>/crumbs.jsonl`
  - Legacy flat-file crumbs (without `app` field) are still readable as app `"unknown"`

## 0.3.3

### Patch Changes

- e7ca8bf: Format crumb data on the same line as the message instead of a separate line

## 0.3.2

### Patch Changes

- 88fe868: Switch to tshy for dual ESM/CJS builds, remove unused ./test subpath export

## 0.3.1

### Patch Changes

- 7203600: Fix docs URLs from docs.agentcrumbs.dev to agentcrumbs.dev/docs

## 0.3.0

### Minor Changes

- 62abf24: Fix @tanstack/intent skill discovery and consolidate skills

  - Add parent SKILL.md at the namespace level so the intent walker can recurse into skill subdirectories
  - Consolidate 6 granular skills into 2: a top-level usage skill and the init skill
  - Top-level skill covers workflow, core API, markers, CLI reference, and pointers to further discovery

## 0.2.0

### Minor Changes

- 19ea754: Initial release. Debug tracing for AI agents with zero overhead when disabled, strip-before-merge workflow, HTTP collector, CLI tools, and @tanstack/intent skills.
