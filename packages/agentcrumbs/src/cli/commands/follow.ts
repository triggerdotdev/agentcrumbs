import { formatCrumbPretty, formatCrumbJson } from "../format.js";
import { getFlag, hasFlag } from "../args.js";
import { parseAppFlags, readAllCrumbs } from "../app-store.js";

export async function follow(args: string[]): Promise<void> {
  const traceId = getFlag(args, "--trace");
  const json = hasFlag(args, "--json");
  const appCtx = parseAppFlags(args);
  const showApp = appCtx.allApps;

  if (!traceId) {
    process.stderr.write("Usage: agentcrumbs follow --trace <traceId> [--app <name>] [--all-apps] [--json]\n");
    process.exit(1);
  }

  const allCrumbs = readAllCrumbs(appCtx);
  const traceCrumbs = allCrumbs.filter((c) => c.traceId === traceId);

  if (traceCrumbs.length === 0) {
    process.stderr.write(`No crumbs found for trace: ${traceId}\n`);
    process.exit(1);
  }

  traceCrumbs.sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  process.stderr.write(
    `Following trace ${traceId} (${traceCrumbs.length} crumbs)\n\n`
  );

  for (const crumb of traceCrumbs) {
    if (json) {
      process.stdout.write(formatCrumbJson(crumb) + "\n");
    } else {
      process.stdout.write(formatCrumbPretty(crumb, { showApp }) + "\n");
    }
  }
}
