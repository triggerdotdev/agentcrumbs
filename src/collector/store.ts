import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Crumb } from "../types.js";

const DEFAULT_DIR = path.join(os.homedir(), ".agentcrumbs");
const DEFAULT_FILE = "crumbs.jsonl";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB before rotation

export class CrumbStore {
  private filePath: string;
  private fd: number | undefined;

  constructor(dir?: string) {
    const storeDir = dir ?? DEFAULT_DIR;
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    this.filePath = path.join(storeDir, DEFAULT_FILE);
  }

  private ensureFd(): number {
    if (this.fd === undefined) {
      this.fd = fs.openSync(this.filePath, "a");
    }
    return this.fd;
  }

  append(crumb: Crumb): void {
    const line = JSON.stringify(crumb) + "\n";
    fs.writeSync(this.ensureFd(), line);
    this.maybeRotate();
  }

  appendRaw(line: string): void {
    fs.writeSync(this.ensureFd(), line.endsWith("\n") ? line : line + "\n");
    this.maybeRotate();
  }

  private maybeRotate(): void {
    try {
      const stat = fs.fstatSync(this.ensureFd());
      if (stat.size > MAX_FILE_SIZE) {
        this.rotate();
      }
    } catch {
      // ignore
    }
  }

  private rotate(): void {
    if (this.fd !== undefined) {
      fs.closeSync(this.fd);
      this.fd = undefined;
    }

    const rotated = this.filePath + ".1";
    try {
      if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
      fs.renameSync(this.filePath, rotated);
    } catch {
      // ignore rotation errors
    }
  }

  getFilePath(): string {
    return this.filePath;
  }

  readAll(): Crumb[] {
    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      return content
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as Crumb;
          } catch {
            return null;
          }
        })
        .filter((c): c is Crumb => c !== null);
    } catch {
      return [];
    }
  }

  clear(): void {
    if (this.fd !== undefined) {
      fs.closeSync(this.fd);
      this.fd = undefined;
    }
    try {
      fs.writeFileSync(this.filePath, "");
    } catch {
      // ignore
    }
  }

  close(): void {
    if (this.fd !== undefined) {
      fs.closeSync(this.fd);
      this.fd = undefined;
    }
  }
}
