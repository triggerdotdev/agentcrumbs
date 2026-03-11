import { formatCrumbPretty, formatCrumbJson } from "../format.js";
import { hasFlag } from "../args.js";
import { parseAppFlags, readAllCrumbs } from "../app-store.js";

export async function replay(args: string[]): Promise<void> {
  const sessionId = args[0];
  const json = hasFlag(args, "--json");
  const appCtx = parseAppFlags(args);
  const showApp = appCtx.allApps;

  if (!sessionId) {
    process.stderr.write("Usage: agentcrumbs replay <session-id> [--app <name>] [--all-apps] [--json]\n");
    process.exit(1);
  }

  const allCrumbs = readAllCrumbs(appCtx);
  const sessionCrumbs = allCrumbs.filter((c) => c.sid === sessionId);

  if (sessionCrumbs.length === 0) {
    process.stderr.write(`No crumbs found for session: ${sessionId}\n`);
    process.exit(1);
  }

  // Sort by timestamp
  sessionCrumbs.sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const first = sessionCrumbs[0]!;
  const last = sessionCrumbs[sessionCrumbs.length - 1]!;
  const duration =
    new Date(last.ts).getTime() - new Date(first.ts).getTime();

  process.stderr.write(
    `Replaying session ${sessionId} (${sessionCrumbs.length} crumbs, ${formatDuration(duration)})\n\n`
  );

  for (const crumb of sessionCrumbs) {
    if (json) {
      process.stdout.write(formatCrumbJson(crumb) + "\n");
    } else {
      process.stdout.write(formatCrumbPretty(crumb, { showApp }) + "\n");
    }
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
