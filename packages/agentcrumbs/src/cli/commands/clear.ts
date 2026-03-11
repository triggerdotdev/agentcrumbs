import { CrumbStore } from "../../collector/store.js";
import { hasFlag } from "../args.js";
import { parseAppFlags, getStoreForContext, resolveApp } from "../app-store.js";

export async function clear(args: string[]): Promise<void> {
  const appCtx = parseAppFlags(args);

  if (appCtx.allApps || hasFlag(args, "--all-apps")) {
    const apps = CrumbStore.listApps();
    for (const app of apps) {
      const store = CrumbStore.forApp(app);
      store.clear();
    }
    process.stdout.write(`Crumb trail cleared for all apps (${apps.length}).\n`);
    return;
  }

  const app = resolveApp(appCtx);
  const store = getStoreForContext(appCtx);
  store.clear();
  process.stdout.write(`Crumb trail cleared for ${app}.\n`);
}
