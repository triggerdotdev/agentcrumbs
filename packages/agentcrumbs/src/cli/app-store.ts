import path from "node:path";
import os from "node:os";
import { CrumbStore } from "../collector/store.js";
import { getApp } from "../env.js";
import { getFlag, hasFlag } from "./args.js";

const DEFAULT_BASE = path.join(os.homedir(), ".agentcrumbs");

export type AppContext = {
  app: string | undefined;
  allApps: boolean;
};

export function parseAppFlags(args: string[]): AppContext {
  const app = getFlag(args, "--app");
  const allApps = hasFlag(args, "--all-apps");
  return { app, allApps };
}

export function resolveApp(ctx: AppContext): string {
  if (ctx.app) return ctx.app;
  return getApp();
}

export function getStoreForContext(ctx: AppContext): CrumbStore {
  if (ctx.allApps) {
    // For --all-apps, callers should use readAllCrumbs instead
    // Return a dummy store for the current app as fallback
    return CrumbStore.forApp(resolveApp(ctx));
  }
  const app = resolveApp(ctx);
  return CrumbStore.forApp(app);
}

export function readAllCrumbs(ctx: AppContext): import("../types.js").Crumb[] {
  if (ctx.allApps) {
    return CrumbStore.readAllApps();
  }
  const store = getStoreForContext(ctx);
  return store.readAll();
}

export function getStoreFilePath(ctx: AppContext): string {
  const store = getStoreForContext(ctx);
  return store.getFilePath();
}

export function getBaseDir(): string {
  return DEFAULT_BASE;
}
