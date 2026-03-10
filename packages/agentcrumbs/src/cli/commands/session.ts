import { randomUUID } from "node:crypto";
import fs from "node:fs";

const SESSION_FILE = "/tmp/agentcrumbs.session";

export async function session(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "start":
      return startSession(args.slice(1));
    case "stop":
      return stopSession(args.slice(1));
    default:
      process.stderr.write(
        "Usage: agentcrumbs session <start|stop> [options]\n\n" +
          "  start <name>    Start a new session\n" +
          "  stop [id]       Stop the active session\n"
      );
      process.exit(1);
  }
}

function startSession(args: string[]): void {
  const name = args[0] ?? "unnamed";

  // Check for existing session
  try {
    const existing = fs.readFileSync(SESSION_FILE, "utf-8").trim();
    if (existing) {
      process.stderr.write(
        `Session already active: ${existing}\n` +
          `Stop it first: agentcrumbs session stop\n`
      );
      process.exit(1);
    }
  } catch {
    // No existing session
  }

  const id = randomUUID().slice(0, 8);
  const sessionData = JSON.stringify({ id, name, startedAt: new Date().toISOString() });
  fs.writeFileSync(SESSION_FILE, sessionData);

  process.stdout.write(`Session started: ${id} (${name})\n`);
  process.stdout.write(`All services will tag crumbs with this session.\n`);
}

function stopSession(args: string[]): void {
  try {
    const content = fs.readFileSync(SESSION_FILE, "utf-8").trim();
    if (!content) {
      process.stderr.write("No active session.\n");
      process.exit(1);
    }

    let sessionInfo: { id: string; name: string; startedAt: string };
    try {
      sessionInfo = JSON.parse(content);
    } catch {
      sessionInfo = { id: content, name: "unknown", startedAt: "" };
    }

    fs.unlinkSync(SESSION_FILE);

    const duration = sessionInfo.startedAt
      ? formatDuration(Date.now() - new Date(sessionInfo.startedAt).getTime())
      : "unknown";

    process.stdout.write(
      `Session stopped: ${sessionInfo.id} (${sessionInfo.name}) - ${duration}\n`
    );
  } catch {
    process.stderr.write("No active session.\n");
    process.exit(1);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
