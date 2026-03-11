import http from "node:http";
import fs from "node:fs";
import { EventEmitter } from "node:events";
import type { Crumb } from "../types.js";
import { CrumbStore } from "./store.js";

const SESSION_FILE = "/tmp/agentcrumbs.session";

export class CollectorServer extends EventEmitter {
  private server: http.Server | undefined;
  private stores = new Map<string, CrumbStore>();
  private baseDir: string | undefined;
  private port: number;

  constructor(port: number, storeDir?: string) {
    super();
    this.port = port;
    this.baseDir = storeDir;
  }

  private getStoreForApp(app: string): CrumbStore {
    let store = this.stores.get(app);
    if (!store) {
      store = CrumbStore.forApp(app, this.baseDir);
      this.stores.set(app, store);
    }
    return store;
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
          const apps = CrumbStore.listApps(this.baseDir);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            status: "ok",
            port: this.port,
            apps,
            session: this.getActiveSession() ?? null,
          }));
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
              const app = crumb.app || "unknown";
              const store = this.getStoreForApp(app);
              store.appendRaw(body);
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
    for (const store of this.stores.values()) {
      store.close();
    }
    this.stores.clear();
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
