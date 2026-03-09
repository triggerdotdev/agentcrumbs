import path from "node:path";
import os from "node:os";
import { CrumbStore } from "../../collector/store.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";

export async function follow(args: string[]): Promise<void> {
  const traceId = getFlag(args, "--trace");
  const json = args.includes("--json");

  if (!traceId) {
    process.stderr.write("Usage: agentcrumbs follow --trace <traceId> [--json]\n");
    process.exit(1);
  }

  const store = new CrumbStore(path.join(os.homedir(), ".agentcrumbs"));
  const allCrumbs = store.readAll();

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
      process.stdout.write(formatCrumbPretty(crumb) + "\n");
    }
  }
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}
