import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CrumbStore } from "../../collector/store.js";

export async function stats(_args: string[]): Promise<void> {
  const storeDir = path.join(os.homedir(), ".agentcrumbs");
  const store = new CrumbStore(storeDir);
  const filePath = store.getFilePath();

  const allCrumbs = store.readAll();
  const namespaces = new Set(allCrumbs.map((c) => c.ns));

  let fileSize = "0B";
  try {
    const stat = fs.statSync(filePath);
    fileSize = formatBytes(stat.size);
  } catch {
    // file might not exist
  }

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentCount = allCrumbs.filter(
    (c) => new Date(c.ts).getTime() >= oneHourAgo
  ).length;

  process.stdout.write(`agentcrumbs stats\n`);
  process.stdout.write(`  Services:    ${[...namespaces].join(", ") || "none"}\n`);
  process.stdout.write(`  Total:       ${allCrumbs.length} crumbs\n`);
  process.stdout.write(`  Last hour:   ${recentCount} crumbs\n`);
  process.stdout.write(`  File:        ${filePath} (${fileSize})\n`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
