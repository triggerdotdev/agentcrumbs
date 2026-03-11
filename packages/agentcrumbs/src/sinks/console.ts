import { inspect } from "node:util";
import type { Crumb, Sink } from "../types.js";
import { colorize, dim, bold, getNamespaceColor } from "../colors.js";

function formatDelta(dt: number): string {
  if (dt < 1000) return `+${Math.round(dt)}ms`;
  if (dt < 60000) return `+${(dt / 1000).toFixed(1)}s`;
  return `+${(dt / 60000).toFixed(1)}m`;
}

function formatData(data: unknown): string {
  if (data === undefined || data === null) return "";
  return inspect(data, { colors: true, compact: true, depth: 4, breakLength: Infinity });
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

export class ConsoleSink implements Sink {
  write(crumb: Crumb): void {
    const color = getNamespaceColor(crumb.ns);
    const ns = colorize(crumb.ns, color);
    const dt = dim(formatDelta(crumb.dt));
    const depth = crumb.depth ?? 0;
    const pad = indent(depth);

    let line: string;

    switch (crumb.type) {
      case "scope:enter":
        line = `${ns} ${pad}${bold(`[${crumb.msg}]`)} ${dim("->")} enter ${dt}`;
        break;
      case "scope:exit":
        line = `${ns} ${pad}${bold(`[${crumb.msg}]`)} ${dim("<-")} exit ${dt}`;
        break;
      case "scope:error":
        line = `${ns} ${pad}${bold(`[${crumb.msg}]`)} ${dim("!!")} error ${dt}`;
        break;
      case "snapshot":
        line = `${ns} ${pad}${dim("snapshot:")} ${crumb.msg} ${dt}`;
        break;
      case "assert":
        line = `${ns} ${pad}${dim("assert:")} ${crumb.msg} ${dt}`;
        break;
      case "time":
        line = `${ns} ${pad}${dim("time:")} ${crumb.msg} ${dt}`;
        break;
      case "session:start":
        line = `${ns} ${pad}${bold("session start:")} ${crumb.msg} ${dim(`[${crumb.sid}]`)} ${dt}`;
        break;
      case "session:end":
        line = `${ns} ${pad}${bold("session end:")} ${crumb.msg} ${dim(`[${crumb.sid}]`)} ${dt}`;
        break;
      default:
        line = `${ns} ${pad}${crumb.msg} ${dt}`;
    }

    if (crumb.tags && crumb.tags.length > 0) {
      line += ` ${dim(`[${crumb.tags.join(", ")}]`)}`;
    }

    const dataStr = formatData(crumb.data);
    if (dataStr) {
      line += ` ${dataStr}`;
    }

    process.stderr.write(line + "\n");
  }
}
