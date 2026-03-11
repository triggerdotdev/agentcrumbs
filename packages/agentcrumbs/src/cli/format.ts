import { inspect } from "node:util";
import type { Crumb } from "../types.js";
import { colorize, dim, bold, getNamespaceColor } from "../colors.js";

export type FormatOptions = {
  showApp?: boolean;
};

function formatDelta(dt: number): string {
  if (dt < 1000) return `+${Math.round(dt)}ms`;
  if (dt < 60000) return `+${(dt / 1000).toFixed(1)}s`;
  return `+${(dt / 60000).toFixed(1)}m`;
}

function formatData(data: unknown): string {
  if (data === undefined || data === null) return "";
  return inspect(data, { colors: true, compact: true, depth: 4, breakLength: Infinity });
}

export function formatCrumbPretty(crumb: Crumb, options?: FormatOptions): string {
  const color = getNamespaceColor(crumb.ns);
  const ns = colorize(crumb.ns.padEnd(20), color);
  const dt = dim(formatDelta(crumb.dt));
  const depth = crumb.depth ?? 0;
  const pad = "  ".repeat(depth);

  let prefix = ns;
  if (options?.showApp && crumb.app) {
    prefix = `${dim(crumb.app)} ${ns}`;
  }

  let line: string;

  switch (crumb.type) {
    case "scope:enter":
      line = `${prefix} ${pad}${bold(`[${crumb.msg}]`)} ${dim("->")} enter ${dt}`;
      break;
    case "scope:exit":
      line = `${prefix} ${pad}${bold(`[${crumb.msg}]`)} ${dim("<-")} exit ${dt}`;
      break;
    case "scope:error":
      line = `${prefix} ${pad}${bold(`[${crumb.msg}]`)} ${dim("!!")} error ${dt}`;
      break;
    case "snapshot":
      line = `${prefix} ${pad}${dim("snapshot:")} ${crumb.msg} ${dt}`;
      break;
    case "assert":
      line = `${prefix} ${pad}${dim("assert:")} ${crumb.msg} ${dt}`;
      break;
    case "time":
      line = `${prefix} ${pad}${dim("time:")} ${crumb.msg} ${dt}`;
      break;
    case "session:start":
      line = `${prefix} ${pad}${bold("session start:")} ${crumb.msg} ${dim(`[${crumb.sid}]`)} ${dt}`;
      break;
    case "session:end":
      line = `${prefix} ${pad}${bold("session end:")} ${crumb.msg} ${dim(`[${crumb.sid}]`)} ${dt}`;
      break;
    default:
      line = `${prefix} ${pad}${crumb.msg} ${dt}`;
  }

  if (crumb.tags && crumb.tags.length > 0) {
    line += ` ${dim(`[${crumb.tags.join(", ")}]`)}`;
  }

  if (crumb.sid) {
    line += ` ${dim(`sid:${crumb.sid}`)}`;
  }

  const dataStr = formatData(crumb.data);
  if (dataStr) {
    line += ` ${dataStr}`;
  }

  return line;
}

export function formatCrumbJson(crumb: Crumb): string {
  return JSON.stringify(crumb);
}
