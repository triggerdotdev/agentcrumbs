import type { AgentCrumbsConfig } from "./types.js";

const DEFAULT_PORT = 8374;

type ParsedConfig =
  | { enabled: false }
  | {
      enabled: true;
      app?: string;
      includes: RegExp[];
      excludes: RegExp[];
      port: number;
      format: "pretty" | "json";
    };

let cachedConfig: ParsedConfig | undefined;
let cachedApp: string | undefined;

declare const globalThis: {
  __AGENTCRUMBS__?: string | AgentCrumbsConfig;
  __AGENTCRUMBS_APP__?: string;
};

function namespaceToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*?");
  return new RegExp(`^${escaped}$`);
}

/**
 * Configure agentcrumbs in the browser.
 *
 * @example
 *   configure("*")            // enable all namespaces
 *   configure("myapp:*")      // enable namespaces matching pattern
 *   configure({ ns: "*", app: "my-app", format: "pretty" })
 */
export function configure(config: AgentCrumbsConfig | string): void {
  cachedConfig = undefined;
  cachedApp = undefined;

  if (typeof config === "string") {
    (globalThis as Record<string, unknown>).__AGENTCRUMBS__ = config;
  } else {
    (globalThis as Record<string, unknown>).__AGENTCRUMBS__ = config;
  }
}

export function parseConfig(): ParsedConfig {
  if (cachedConfig !== undefined) return cachedConfig;

  const raw = globalThis.__AGENTCRUMBS__;
  if (!raw) {
    cachedConfig = { enabled: false };
    return cachedConfig;
  }

  let config: AgentCrumbsConfig;

  if (typeof raw === "object") {
    config = raw;
  } else {
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
    try {
      config = JSON.parse(raw) as AgentCrumbsConfig;
    } catch {
      config = { ns: raw };
    }
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
 * 1. `app` field from configure() config
 * 2. `globalThis.__AGENTCRUMBS_APP__`
 * 3. Fallback: "browser"
 */
export function getApp(): string {
  if (cachedApp !== undefined) return cachedApp;

  const config = parseConfig();
  if (config.enabled && config.app) {
    cachedApp = config.app;
    return cachedApp;
  }

  const globalApp = globalThis.__AGENTCRUMBS_APP__;
  if (globalApp) {
    cachedApp = globalApp;
    return cachedApp;
  }

  cachedApp = "browser";
  return cachedApp;
}

/** Reset cached config — useful for tests */
export function resetConfig(): void {
  cachedConfig = undefined;
}

/** Reset cached app — useful for tests */
export function resetApp(): void {
  cachedApp = undefined;
}
