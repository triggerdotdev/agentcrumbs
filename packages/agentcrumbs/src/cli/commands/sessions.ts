import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { CrumbStore } from "../../collector/store.js";

const SESSION_FILE = "/tmp/agentcrumbs.session";

export async function sessions(_args: string[]): Promise<void> {
  const store = new CrumbStore(path.join(os.homedir(), ".agentcrumbs"));
  const allCrumbs = store.readAll();

  // Find all sessions from crumbs
  const sessionMap = new Map<
    string,
    { name: string; startedAt: string; endedAt?: string; count: number }
  >();

  for (const crumb of allCrumbs) {
    if (!crumb.sid) continue;

    const existing = sessionMap.get(crumb.sid);
    if (!existing) {
      sessionMap.set(crumb.sid, {
        name: crumb.type === "session:start" ? crumb.msg : "unknown",
        startedAt: crumb.ts,
        endedAt: crumb.type === "session:end" ? crumb.ts : undefined,
        count: 1,
      });
    } else {
      existing.count++;
      if (crumb.type === "session:start") existing.name = crumb.msg;
      if (crumb.type === "session:end") existing.endedAt = crumb.ts;
      // Update earliest/latest timestamps
      if (crumb.ts < existing.startedAt) existing.startedAt = crumb.ts;
      if (!existing.endedAt || crumb.ts > existing.endedAt) {
        if (crumb.type !== "session:end") {
          // don't update endedAt for non-end crumbs
        } else {
          existing.endedAt = crumb.ts;
        }
      }
    }
  }

  // Check for active CLI session
  let activeSessionId: string | undefined;
  try {
    const content = fs.readFileSync(SESSION_FILE, "utf-8").trim();
    if (content) {
      try {
        const parsed = JSON.parse(content);
        activeSessionId = parsed.id;
      } catch {
        activeSessionId = content;
      }
    }
  } catch {
    // no active session
  }

  if (sessionMap.size === 0) {
    process.stderr.write("No sessions found.\n");
    return;
  }

  // Print header
  process.stdout.write(
    `${"ID".padEnd(10)} ${"Name".padEnd(25)} ${"Duration".padEnd(12)} ${"Crumbs".padEnd(8)} Status\n`
  );
  process.stdout.write("-".repeat(70) + "\n");

  for (const [id, info] of sessionMap) {
    const isActive = id === activeSessionId;
    const duration = info.endedAt
      ? formatDuration(
          new Date(info.endedAt).getTime() - new Date(info.startedAt).getTime()
        )
      : isActive
        ? "-"
        : "?";
    const status = isActive ? "active" : info.endedAt ? "stopped" : "?";

    process.stdout.write(
      `${id.padEnd(10)} ${info.name.padEnd(25)} ${duration.padEnd(12)} ${String(info.count).padEnd(8)} ${status}\n`
    );
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
