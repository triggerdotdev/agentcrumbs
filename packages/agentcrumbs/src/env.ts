import fs from "node:fs";
import path from "node:path";
import type { AgentCrumbsConfig } from "./types.js";

const DEFAULT_PORT = 8374;

type ParsedConfig = {
  enabled: false;
} | {
  enabled: true;
  app?: string;
  includes: RegExp[];
  excludes: RegExp[];
  port: number;
  format: "pretty" | "json";
};

let cachedConfig: ParsedConfig | undefined;
let cachedApp: string | undefined;

function namespaceToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*?");
  return new RegExp(`^${escaped}$`);
}

export function parseConfig(): ParsedConfig {
  if (cachedConfig !== undefined) return cachedConfig;

  const raw = process.env.AGENTCRUMBS;
  if (!raw) {
    cachedConfig = { enabled: false };
    return cachedConfig;
  }

  // Shorthand: "1", "*", "true" → enable all
  if (raw === "1" || raw === "*" || raw === "true") {
    cachedConfig = {
      enabled: true,
      includes: [/^.*$/],
      excludes: [],
      port: DEFAULT_PORT,
      format: "pretty",
    };
    return cachedConfig;
  }

  // Try parsing as JSON config object
  let config: AgentCrumbsConfig;
  try {
    config = JSON.parse(raw) as AgentCrumbsConfig;
  } catch {
    // If not valid JSON, treat the raw string as a namespace filter
    config = { ns: raw };
  }

  const parts = config.ns.split(/[\s,]+/).filter(Boolean);
  const includes: RegExp[] = [];
  const excludes: RegExp[] = [];

  for (const part of parts) {
    if (part.startsWith("-")) {
      excludes.push(namespaceToRegex(part.slice(1)));
    } else {
      includes.push(namespaceToRegex(part));
    }
  }

  // If no includes specified, nothing matches
  if (includes.length === 0) {
    cachedConfig = { enabled: false };
    return cachedConfig;
  }

  cachedConfig = {
    enabled: true,
    app: config.app,
    includes,
    excludes,
    port: config.port ?? DEFAULT_PORT,
    format: config.format ?? "pretty",
  };
  return cachedConfig;
}

export function isNamespaceEnabled(namespace: string): boolean {
  const config = parseConfig();
  if (!config.enabled) return false;

  const included = config.includes.some((re) => re.test(namespace));
  if (!included) return false;

  const excluded = config.excludes.some((re) => re.test(namespace));
  return !excluded;
}

export function getCollectorUrl(): string {
  const config = parseConfig();
  const port = config.enabled ? config.port : DEFAULT_PORT;
  return `http://localhost:${port}/crumb`;
}

export function getFormat(): "pretty" | "json" {
  const config = parseConfig();
  if (!config.enabled) return "pretty";
  return config.format;
}

/**
 * Resolve the app name. Priority:
 * 1. `app` field from AGENTCRUMBS JSON config
 * 2. AGENTCRUMBS_APP env var
 * 3. Nearest package.json `name` field (walk up from cwd)
 * 4. Fallback: "unknown"
 */
export function getApp(): string {
  if (cachedApp !== undefined) return cachedApp;

  // 1. From parsed AGENTCRUMBS config
  const config = parseConfig();
  if (config.enabled && config.app) {
    cachedApp = config.app;
    return cachedApp;
  }

  // 2. From dedicated env var
  const envApp = process.env.AGENTCRUMBS_APP;
  if (envApp) {
    cachedApp = envApp;
    return cachedApp;
  }

  // 3. Auto-detect from nearest package.json
  cachedApp = detectAppFromPackageJson() ?? "unknown";
  return cachedApp;
}

function detectAppFromPackageJson(): string | undefined {
  let dir = process.cwd();

  for (let i = 0; i < 50; i++) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const content = fs.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(content) as { name?: string };
      if (pkg.name) {
        // Strip @scope/ prefix
        return pkg.name.replace(/^@[^/]+\//, "");
      }
    } catch {
      // no package.json here, keep walking
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}

/** Reset cached config — useful for tests */
export function resetConfig(): void {
  cachedConfig = undefined;
}

/** Reset cached app — useful for tests */
export function resetApp(): void {
  cachedApp = undefined;
}
