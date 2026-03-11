import fs from "node:fs";
import { CrumbStore } from "../../collector/store.js";
import { parseAppFlags, readAllCrumbs, resolveApp, getStoreFilePath } from "../app-store.js";

export async function stats(args: string[]): Promise<void> {
  const appCtx = parseAppFlags(args);

  if (appCtx.allApps) {
    // Show stats for all apps
    const apps = CrumbStore.listApps();
    if (apps.length === 0) {
      process.stdout.write("No apps found.\n");
      return;
    }

    process.stdout.write(`agentcrumbs stats (all apps)\n\n`);

    for (const app of apps) {
      const store = CrumbStore.forApp(app);
      const crumbs = store.readAll();
      const namespaces = new Set(crumbs.map((c) => c.ns));
      const filePath = store.getFilePath();

      let fileSize = "0B";
      try {
        const stat = fs.statSync(filePath);
        fileSize = formatBytes(stat.size);
      } catch {
        // file might not exist
      }

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentCount = crumbs.filter(
        (c) => new Date(c.ts).getTime() >= oneHourAgo
      ).length;

      process.stdout.write(`  ${app}\n`);
      process.stdout.write(`    Services:  ${[...namespaces].join(", ") || "none"}\n`);
      process.stdout.write(`    Total:     ${crumbs.length} crumbs\n`);
      process.stdout.write(`    Last hour: ${recentCount} crumbs\n`);
      process.stdout.write(`    File:      ${filePath} (${fileSize})\n\n`);
    }
    return;
  }

  // Single app stats
  const app = resolveApp(appCtx);
  const allCrumbs = readAllCrumbs(appCtx);
  const namespaces = new Set(allCrumbs.map((c) => c.ns));
  const filePath = getStoreFilePath(appCtx);

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

  process.stdout.write(`agentcrumbs stats (${app})\n`);
  process.stdout.write(`  App:         ${app}\n`);
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
