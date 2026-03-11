import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";

const CURSOR_FILE = path.join(os.homedir(), ".agentcrumbs", ".cursors.json");
const MAX_CURSORS = 50;
const CURSOR_TTL = 60 * 60 * 1000; // 1 hour

type CursorEntry = {
  ts: string;
  offset: number;
  createdAt: number;
};

type CursorMap = Record<string, CursorEntry>;

function readCursors(): CursorMap {
  try {
    return JSON.parse(fs.readFileSync(CURSOR_FILE, "utf-8")) as CursorMap;
  } catch {
    return {};
  }
}

function writeCursors(cursors: CursorMap): void {
  const dir = path.dirname(CURSOR_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CURSOR_FILE, JSON.stringify(cursors));
}

function generateId(ts: string, offset: number): string {
  const hash = createHash("sha256").update(`${ts}:${offset}`).digest("hex");
  return hash.slice(0, 8);
}

function pruneOld(cursors: CursorMap): CursorMap {
  const now = Date.now();
  const entries = Object.entries(cursors)
    .filter(([, v]) => now - v.createdAt < CURSOR_TTL)
    .sort((a, b) => b[1].createdAt - a[1].createdAt)
    .slice(0, MAX_CURSORS);
  return Object.fromEntries(entries);
}

export function saveCursor(ts: string, offset: number): string {
  const id = generateId(ts, offset);
  const cursors = pruneOld(readCursors());
  cursors[id] = { ts, offset, createdAt: Date.now() };
  writeCursors(cursors);
  return id;
}

export function resolveCursor(id: string): CursorEntry | undefined {
  const cursors = readCursors();
  return cursors[id];
}
