import http from "node:http";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import type { Crumb } from "../types.js";
import { CrumbStore } from "./store.js";

const SESSION_FILE = "/tmp/agentcrumbs.session";

export class CollectorServer extends EventEmitter {
  private server: http.Server | undefined;
  private store: CrumbStore;
  private port: number;

  constructor(port: number, storeDir?: string) {
    super();
    this.port = port;
    this.store = new CrumbStore(storeDir);
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === "/health" && req.method === "GET") {
          res.writeHead(200);
          res.end("ok");
          return;
        }

        if (req.url === "/crumb" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const crumb = JSON.parse(body) as Crumb;
              this.store.appendRaw(body);
              this.emit("crumb", crumb);
              res.writeHead(200);
              res.end("ok");
            } catch {
              res.writeHead(400);
              res.end("bad json");
            }
          });
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.server.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
    this.store.close();
  }

  getStore(): CrumbStore {
    return this.store;
  }

  getPort(): number {
    return this.port;
  }

  startSession(id: string): void {
    fs.writeFileSync(SESSION_FILE, id);
  }

  stopSession(): string | undefined {
    try {
      const id = fs.readFileSync(SESSION_FILE, "utf-8").trim();
      fs.unlinkSync(SESSION_FILE);
      return id || undefined;
    } catch {
      return undefined;
    }
  }

  getActiveSession(): string | undefined {
    try {
      const id = fs.readFileSync(SESSION_FILE, "utf-8").trim();
      return id || undefined;
    } catch {
      return undefined;
    }
  }
}
