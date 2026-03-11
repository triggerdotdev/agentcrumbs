import type { Crumb } from "../../types.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";
import { getFlag, hasFlag } from "../args.js";
import { parseAppFlags, readAllCrumbs } from "../app-store.js";

export async function query(args: string[]): Promise<void> {
  const ns = getFlag(args, "--ns");
  const tag = getFlag(args, "--tag");
  const since = getFlag(args, "--since");
  const session = getFlag(args, "--session");
  const match = getFlag(args, "--match");
  const json = hasFlag(args, "--json");
  const limit = parseInt(getFlag(args, "--limit") ?? "100", 10);
  const appCtx = parseAppFlags(args);
  const showApp = appCtx.allApps;

  const allCrumbs = readAllCrumbs(appCtx);

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
      process.stdout.write(formatCrumbPretty(crumb, { showApp }) + "\n");
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
