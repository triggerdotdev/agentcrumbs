import type { AgentCrumbsConfig } from "./types.js";

const DEFAULT_PORT = 8374;

type ParsedConfig = {
  enabled: false;
} | {
  enabled: true;
  includes: RegExp[];
  excludes: RegExp[];
  port: number;
  format: "pretty" | "json";
};

let cachedConfig: ParsedConfig | undefined;

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

/** Reset cached config — useful for tests */
export function resetConfig(): void {
  cachedConfig = undefined;
}
