import type { Crumb, Sink } from "../types.js";
import { getNamespaceColor } from "../colors.js";

// Map ANSI 256-color indices to CSS colors for DevTools
const COLOR_MAP: Record<number, string> = {
  1: "#cc0000",
  2: "#4e9a06",
  3: "#c4a000",
  4: "#3465a4",
  5: "#75507b",
  6: "#06989a",
  9: "#ef2929",
  10: "#8ae234",
  11: "#fce94f",
  12: "#729fcf",
  13: "#ad7fa8",
  14: "#34e2e2",
  170: "#d75fd7",
  196: "#ff0000",
  202: "#ff5f00",
  208: "#ff8700",
};

function cssColor(colorIndex: number): string {
  return COLOR_MAP[colorIndex] ?? "#999";
}

function formatDelta(dt: number): string {
  if (dt < 1000) return `+${Math.round(dt)}ms`;
  if (dt < 60000) return `+${(dt / 1000).toFixed(1)}s`;
  return `+${(dt / 60000).toFixed(1)}m`;
}

export class ConsoleSink implements Sink {
  write(crumb: Crumb): void {
    const color = cssColor(getNamespaceColor(crumb.ns));
    const dt = formatDelta(crumb.dt);
    const depth = crumb.depth ?? 0;
    const pad = "  ".repeat(depth);

    const nsStyle = `color: ${color}; font-weight: bold`;
    const dimStyle = "color: #999";
    const boldStyle = "font-weight: bold";

    let label: string;
    let styles: string[];

    switch (crumb.type) {
      case "scope:enter":
        label = `%c${crumb.ns} %c${pad}%c[${crumb.msg}]%c -> enter %c${dt}`;
        styles = [nsStyle, "", boldStyle, dimStyle, dimStyle];
        break;
      case "scope:exit":
        label = `%c${crumb.ns} %c${pad}%c[${crumb.msg}]%c <- exit %c${dt}`;
        styles = [nsStyle, "", boldStyle, dimStyle, dimStyle];
        break;
      case "scope:error":
        label = `%c${crumb.ns} %c${pad}%c[${crumb.msg}]%c !! error %c${dt}`;
        styles = [nsStyle, "", boldStyle, "color: red", dimStyle];
        break;
      case "snapshot":
        label = `%c${crumb.ns} %c${pad}%csnapshot:%c ${crumb.msg} %c${dt}`;
        styles = [nsStyle, "", dimStyle, "", dimStyle];
        break;
      case "assert":
        label = `%c${crumb.ns} %c${pad}%cassert:%c ${crumb.msg} %c${dt}`;
        styles = [nsStyle, "", dimStyle, "", dimStyle];
        break;
      case "time":
        label = `%c${crumb.ns} %c${pad}%ctime:%c ${crumb.msg} %c${dt}`;
        styles = [nsStyle, "", dimStyle, "", dimStyle];
        break;
      case "session:start":
        label = `%c${crumb.ns} %c${pad}%csession start:%c ${crumb.msg} %c[${crumb.sid}] %c${dt}`;
        styles = [nsStyle, "", boldStyle, "", dimStyle, dimStyle];
        break;
      case "session:end":
        label = `%c${crumb.ns} %c${pad}%csession end:%c ${crumb.msg} %c[${crumb.sid}] %c${dt}`;
        styles = [nsStyle, "", boldStyle, "", dimStyle, dimStyle];
        break;
      default:
        label = `%c${crumb.ns} %c${pad}${crumb.msg} %c${dt}`;
        styles = [nsStyle, "", dimStyle];
    }

    if (crumb.tags && crumb.tags.length > 0) {
      label += ` %c[${crumb.tags.join(", ")}]`;
      styles.push(dimStyle);
    }

    const args: unknown[] = [label, ...styles];

    // Pass data as an additional arg so DevTools renders it interactively
    if (crumb.data !== undefined) {
      args.push(crumb.data);
    }

    // Use groupCollapsed for scope enter, groupEnd for scope exit
    if (crumb.type === "scope:enter") {
      console.groupCollapsed(...(args as [string, ...string[]]));
    } else if (crumb.type === "scope:exit" || crumb.type === "scope:error") {
      console.debug(...(args as [string, ...string[]]));
      console.groupEnd();
    } else {
      console.debug(...(args as [string, ...string[]]));
    }
  }
}
