import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Crumb } from "../../types.js";
import { formatCrumbPretty, formatCrumbJson } from "../format.js";
import { getFlag, hasFlag } from "../args.js";

export async function tail(args: string[]): Promise<void> {
  const ns = getFlag(args, "--ns");
  const tag = getFlag(args, "--tag");
  const match = getFlag(args, "--match");
  const session = getFlag(args, "--session");
  const json = hasFlag(args, "--json");

  const dir = path.join(os.homedir(), ".agentcrumbs");
  const filePath = path.join(dir, "crumbs.jsonl");

  if (!fs.existsSync(filePath)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, "");
    process.stderr.write("Waiting for crumbs... (start the collector: agentcrumbs collect)\n");
  }

  // Print existing lines from the end (last 50)
  const existing = readLastLines(filePath, 50);
  for (const crumb of existing) {
    if (matchesCrumb(crumb, { ns, tag, match, session })) {
      printCrumb(crumb, json);
    }
  }

  // Watch for new lines
  let fileSize = fs.statSync(filePath).size;

  const watcher = fs.watch(filePath, () => {
    try {
      const newSize = fs.statSync(filePath).size;
      if (newSize <= fileSize) {
        fileSize = newSize;
        return;
      }

      const buffer = Buffer.alloc(newSize - fileSize);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, buffer.length, fileSize);
      fs.closeSync(fd);
      fileSize = newSize;

      const lines = buffer.toString("utf-8").split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const crumb = JSON.parse(line) as Crumb;
          if (matchesCrumb(crumb, { ns, tag, match, session })) {
            printCrumb(crumb, json);
          }
        } catch {
          // skip invalid lines
        }
      }
    } catch {
      // ignore read errors
    }
  });

  const shutdown = () => {
    watcher.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

type Filters = {
  ns?: string;
  tag?: string;
  match?: string;
  session?: string;
};

function matchesCrumb(crumb: Crumb, filters: Filters): boolean {
  if (filters.ns) {
    const pattern = filters.ns.replace(/\*/g, ".*");
    if (!new RegExp(`^${pattern}$`).test(crumb.ns)) return false;
  }
  if (filters.tag) {
    if (!crumb.tags?.includes(filters.tag)) return false;
  }
  if (filters.session) {
    if (crumb.sid !== filters.session) return false;
  }
  if (filters.match) {
    const str = JSON.stringify(crumb);
    if (!str.includes(filters.match)) return false;
  }
  return true;
}

function printCrumb(crumb: Crumb, json: boolean): void {
  if (json) {
    process.stdout.write(formatCrumbJson(crumb) + "\n");
  } else {
    process.stdout.write(formatCrumbPretty(crumb) + "\n");
  }
}

function readLastLines(filePath: string, count: number): Crumb[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    const lastLines = lines.slice(-count);
    return lastLines
      .map((line) => {
        try {
          return JSON.parse(line) as Crumb;
        } catch {
          return null;
        }
      })
      .filter((c): c is Crumb => c !== null);
  } catch {
    return [];
  }
}

