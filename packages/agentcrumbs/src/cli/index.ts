#!/usr/bin/env node

import { collect } from "./commands/collect.js";
import { tail } from "./commands/tail.js";
import { query } from "./commands/query.js";
import { follow } from "./commands/follow.js";
import { session } from "./commands/session.js";
import { sessions } from "./commands/sessions.js";
import { replay } from "./commands/replay.js";
import { stats } from "./commands/stats.js";
import { clear } from "./commands/clear.js";
import { strip } from "./commands/strip.js";

const HELP = `agentcrumbs — debug tracing for agents

Usage: agentcrumbs <command> [options]

Commands:
  collect              Start the collector (HTTP server)
  tail                 Live tail of crumbs
  query                Query historical crumbs
  follow               Follow a specific trace
  session start|stop   Start or stop a debug session
  sessions             List all sessions
  replay <id>          Replay a session
  strip                Strip crumb markers from source files
  stats                Show statistics
  clear                Clear the crumb trail

Tail options:
  --ns <pattern>       Filter by namespace (supports wildcards)
  --tag <tag>          Filter by tag
  --match <text>       Filter by text content
  --session <id>       Filter by session ID
  --json               Output as JSON

Query options:
  --since <duration>   Time filter (e.g., 5m, 1h, 24h)
  --ns <pattern>       Filter by namespace
  --tag <tag>          Filter by tag
  --session <id>       Filter by session ID
  --match <text>       Filter by text content
  --limit <n>          Max results (default: 100)
  --json               Output as JSON

Collect options:
  --port <n>           HTTP port (default: 8374)
  --dir <path>         Storage directory (default: ~/.agentcrumbs)
  --quiet              Don't print crumbs to stdout

Strip options:
  --check              Check for markers without removing (exits 1 if found)
  --dry-run            Show what would be removed
  --dir <path>         Directory to scan (default: cwd)
  --ext <list>         File extensions (default: .ts,.tsx,.js,.jsx,.mjs,.mts)

App filtering (available on most commands):
  --app <name>         Scope to a specific app (default: auto-detect from package.json)
  --all-apps           Show crumbs from all apps

Environment:
  AGENTCRUMBS          Enable debug tracing (see docs for format)
  AGENTCRUMBS_APP      Override app name (default: auto-detect from package.json)
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case "collect":
      return collect(commandArgs);
    case "tail":
      return tail(commandArgs);
    case "query":
      return query(commandArgs);
    case "follow":
      return follow(commandArgs);
    case "session":
      return session(commandArgs);
    case "sessions":
      return sessions(commandArgs);
    case "replay":
      return replay(commandArgs);
    case "strip":
      return strip(commandArgs);
    case "stats":
      return stats(commandArgs);
    case "clear":
      return clear(commandArgs);
    case "--help":
    case "-h":
    case "help":
    case undefined:
      process.stdout.write(HELP);
      break;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      process.stdout.write(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
