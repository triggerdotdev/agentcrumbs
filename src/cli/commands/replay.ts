import path from "node:path";
import os from "node:os";
import { CrumbStore } from "../../collector/store.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";

export async function replay(args: string[]): Promise<void> {
  const sessionId = args[0];
  const json = args.includes("--json");

  if (!sessionId) {
    process.stderr.write("Usage: agentcrumbs replay <session-id> [--json]\n");
    process.exit(1);
  }

  const store = new CrumbStore(path.join(os.homedir(), ".agentcrumbs"));
  const allCrumbs = store.readAll();

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
      process.stdout.write(formatCrumbPretty(crumb) + "\n");
    }
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
