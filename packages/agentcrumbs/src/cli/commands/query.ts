import type { Crumb } from "../../types.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";
import { getFlag, hasFlag } from "../args.js";
import { parseAppFlags, readAllCrumbs } from "../app-store.js";
import { saveCursor, resolveCursor } from "../cursor.js";

export async function query(args: string[]): Promise<void> {
  const ns = getFlag(args, "--ns");
  const tag = getFlag(args, "--tag");
  const since = getFlag(args, "--since");
  const after = getFlag(args, "--after");
  const before = getFlag(args, "--before");
  const cursor = getFlag(args, "--cursor");
  const session = getFlag(args, "--session");
  const match = getFlag(args, "--match");
  const json = hasFlag(args, "--json");
  const limit = parseInt(getFlag(args, "--limit") ?? "50", 10);
  const appCtx = parseAppFlags(args);
  const showApp = appCtx.allApps;

  const allCrumbs = readAllCrumbs(appCtx);

  let filtered = allCrumbs;

  // Time window filters
  if (since) {
    const cutoff = parseSince(since);
    filtered = filtered.filter((c) => new Date(c.ts).getTime() >= cutoff);
  }

  if (after) {
    const afterMs = new Date(after).getTime();
    if (isNaN(afterMs)) {
      process.stderr.write(`Invalid --after timestamp: "${after}". Use ISO 8601 format.\n`);
      process.exit(1);
    }
    filtered = filtered.filter((c) => new Date(c.ts).getTime() > afterMs);
  }

  if (before) {
    const beforeMs = new Date(before).getTime();
    if (isNaN(beforeMs)) {
      process.stderr.write(`Invalid --before timestamp: "${before}". Use ISO 8601 format.\n`);
      process.exit(1);
    }
    filtered = filtered.filter((c) => new Date(c.ts).getTime() < beforeMs);
  }

  // Content filters
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

  const total = filtered.length;

  // Resolve cursor to skip offset
  let startIndex = 0;
  if (cursor) {
    const entry = resolveCursor(cursor);
    if (!entry) {
      process.stderr.write(`Cursor expired or invalid: ${cursor}\n`);
      process.exit(1);
    }
    startIndex = entry.offset;
  }

  const results = filtered.slice(startIndex, startIndex + limit);

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

  // Pagination footer
  const endIndex = startIndex + results.length;
  const hasMore = endIndex < total;
  if (hasMore) {
    const lastTs = results[results.length - 1]!.ts;
    const nextCursor = saveCursor(lastTs, endIndex);
    process.stderr.write(
      `\n${results.length} crumbs (${startIndex + 1}-${endIndex} of ${total}). Next: --cursor ${nextCursor}\n`
    );
  } else {
    if (startIndex > 0) {
      process.stderr.write(`\n${results.length} crumbs (${startIndex + 1}-${endIndex} of ${total}).\n`);
    } else {
      process.stderr.write(`\n${results.length} crumbs.\n`);
    }
  }
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
