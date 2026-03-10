---
name: agentcrumbs/sessions-and-tags
description: >
  Session management and tag-based filtering in agentcrumbs. crumb.session(),
  session.crumb(), session.end(), tags option, CLI session start/stop,
  sid field, session replay, tag filtering. Activate when grouping crumbs
  into debug sessions, tagging crumbs for later filtering, using the
  agentcrumbs session CLI, or replaying captured sessions.
type: sub-skill
library: agentcrumbs
library_version: "0.1.0"
requires:
  - agentcrumbs/core
sources:
  - "triggerdotdev/trigger-labs:debug-mode/src/trail.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/cli/commands/session.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/cli/commands/sessions.ts"
  - "triggerdotdev/trigger-labs:debug-mode/src/cli/commands/replay.ts"
  - "triggerdotdev/trigger-labs:debug-mode/README.md"
---

# agentcrumbs — Sessions and Tags

This skill builds on agentcrumbs/core. Read it first for foundational concepts.

## Tags

Tags are string labels attached to crumbs for filtering. Pass them as the third argument.

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("auth-service");

crumb("token expired", { userId: "u_123" }, { tags: ["auth-failure", "retry"] });
crumb("cache miss", { key: "sessions:abc" }, { tags: ["perf", "cache"] });
crumb("rate limited", { ip: "1.2.3.4" }, { tags: ["security", "rate-limit"] });
```

Query by tag with the CLI:

```bash
agentcrumbs query --tag auth-failure --since 10m
agentcrumbs tail --tag perf
agentcrumbs tail --ns auth-service --tag retry
```

Tags are omitted from the JSONL output when the array is empty (no wasted bytes).

## Sessions — Programmatic

Group crumbs into logical units with a unique session ID and start/end boundaries.

### Manual session lifecycle

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("debugger");

const session = crumb.session("investigating-timeout");
session.crumb("checking connection pool", { active: 5, idle: 0 });
session.crumb("found stale connection", { age: "45s" }, { tags: ["root-cause"] });
session.end();

// Query later:
// agentcrumbs query --session <session.id> --tag root-cause
```

### Scoped session (auto-ends)

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("signup-flow");

await crumb.session("user-signup", async (s) => {
  s.crumb("validating email", { email });
  await validateEmail(email);
  s.crumb("creating account");
  const user = await createUser({ email });
  s.crumb("account created", { userId: user.id });
});
// session:end emitted automatically when the function returns
```

## Sessions — CLI

Start and stop sessions from the terminal. All running services automatically tag crumbs with the active session ID.

```bash
# Start a session
agentcrumbs session start "debugging-auth-timeout"
# Session started: a1b2c3 (debugging-auth-timeout)

# ... reproduce the issue across any number of services ...

# Stop the session
agentcrumbs session stop
# Session stopped: a1b2c3 (debugging-auth-timeout) - 2m 15s
```

How it works: the CLI writes the session ID to `/tmp/agentcrumbs.session`. Library instances read this file and attach the session ID to outgoing crumbs. No code changes needed.

```bash
# List sessions
agentcrumbs sessions

# Replay a session
agentcrumbs replay a1b2c3
agentcrumbs replay a1b2c3 --json

# Query within a session
agentcrumbs query --session a1b2c3
agentcrumbs query --session a1b2c3 --tag root-cause
```

## Common Mistakes

### HIGH: Forgetting to call session.end() on manual sessions

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

function debugIssue() {
  const session = crumb.session("debug-flow");
  session.crumb("step 1");
  session.crumb("step 2");
  // session never ended — no session:end crumb emitted
}
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

function debugIssue() {
  const session = crumb.session("debug-flow");
  session.crumb("step 1");
  session.crumb("step 2");
  session.end();
}

// Or use the scoped form which auto-ends:
async function debugIssueScoped() {
  await crumb.session("debug-flow", async (s) => {
    s.crumb("step 1");
    s.crumb("step 2");
  });
}
```

Without `session.end()`, the `session:end` crumb is never emitted. The session will show as status `?` in `agentcrumbs sessions` and duration calculations will be wrong. Use the scoped form to guarantee cleanup.

### MEDIUM: Confusing CLI sessions with programmatic sessions

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

// Trying to start a CLI session from code
import { writeFileSync } from "fs";
writeFileSync("/tmp/agentcrumbs.session", "my-session-id");
```

Correct:

```bash
# CLI sessions are managed by the CLI
agentcrumbs session start "my-session"
```

```typescript
// Programmatic sessions are managed by code
import { trail } from "agentcrumbs";

const crumb = trail("service");
const session = crumb.session("my-session");
```

CLI sessions and programmatic sessions are separate mechanisms. CLI sessions write a structured JSON file to `/tmp/agentcrumbs.session` that all library instances read. Don't write to this file directly from code — use `crumb.session()` for programmatic sessions, and the CLI for cross-service debug sessions.

### MEDIUM: Passing tags as the second argument

Wrong:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

crumb("event", { tags: ["important"] });
// tags are in data, not in the tags field
```

Correct:

```typescript
import { trail } from "agentcrumbs";

const crumb = trail("service");

crumb("event", { someData: 123 }, { tags: ["important"] });
// data is the second arg, options (with tags) is the third
```

Tags go in the third argument (options object), not in the data object. Putting them in data means they'll appear in the `data` field of the crumb but won't be filterable with `--tag` in the CLI.
