# agentcrumbs

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
