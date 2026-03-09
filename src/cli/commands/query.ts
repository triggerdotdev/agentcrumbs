import path from "node:path";
import os from "node:os";
import type { Crumb } from "../../types.js";
import { CrumbStore } from "../../collector/store.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";

export async function query(args: string[]): Promise<void> {
  const ns = getFlag(args, "--ns");
  const tag = getFlag(args, "--tag");
  const since = getFlag(args, "--since");
  const session = getFlag(args, "--session");
  const match = getFlag(args, "--match");
  const json = args.includes("--json");
  const limit = parseInt(getFlag(args, "--limit") ?? "100", 10);

  const store = new CrumbStore(path.join(os.homedir(), ".agentcrumbs"));
  const allCrumbs = store.readAll();

  let filtered = allCrumbs;

  if (since) {
    const cutoff = parseSince(since);
    filtered = filtered.filter((c) => new Date(c.ts).getTime() >= cutoff);
  }

  if (ns) {
    const pattern = new RegExp(`^${ns.replace(/\*/g, ".*")}$`);
    filtered = filtered.filter((c) => pattern.test(c.ns));
  }

  if (tag) {
    filtered = filtered.filter((c) => c.tags?.includes(tag));
  }

  if (session) {
    filtered = filtered.filter((c) => c.sid === session);
  }

  if (match) {
    filtered = filtered.filter((c) => JSON.stringify(c).includes(match));
  }

  const results = filtered.slice(-limit);

  if (results.length === 0) {
    process.stderr.write("No crumbs found matching filters.\n");
    return;
  }

  for (const crumb of results) {
    if (json) {
      process.stdout.write(formatCrumbJson(crumb) + "\n");
    } else {
      process.stdout.write(formatCrumbPretty(crumb) + "\n");
    }
  }

  process.stderr.write(`\n${results.length} crumbs found.\n`);
}

function parseSince(since: string): number {
  const match = since.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    process.stderr.write(
      `Invalid --since format: "${since}". Use Ns, Nm, Nh, or Nd.\n`
    );
    process.exit(1);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Date.now() - value * multipliers[unit]!;
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}
