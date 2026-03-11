import { trail } from "agentcrumbs"; // @crumbs

import type {
  CacheEntry,
  PaginatedResult,
  ProcessedDocument,
} from "./types.js";

const crumb = trail("doc-store"); // @crumbs

// In-memory "database"
const documents = new Map<string, ProcessedDocument>();

// Simple cache layer
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30_000; // 30 seconds

// #region @crumbs
const cacheGet = crumb.wrap("cache-get", <T>(key: string): T | undefined => {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    crumb("cache miss", { key }, { tags: ["cache"] });
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    crumb("cache expired", { key, expiresAt: entry.expiresAt }, { tags: ["cache"] });
    cache.delete(key);
    return undefined;
  }
  crumb("cache hit", { key }, { tags: ["cache"] });
  return entry.value;
});

function cacheSet<T>(key: string, value: T): void {
  crumb("cache set", { key, ttl: CACHE_TTL }, { tags: ["cache"] });
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}
// #endregion @crumbs

function simulateLatency(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function saveDocument(doc: ProcessedDocument): Promise<void> {
  return crumb.scope("save-document", async () => { // @crumbs
    crumb("writing to store", { id: doc.id, filename: doc.document.filename }); // @crumbs

    crumb.time("db-write"); // @crumbs
    await simulateLatency(20, 80);
    documents.set(doc.id, doc);
    crumb.timeEnd("db-write", { documentsCount: documents.size }); // @crumbs

    cacheSet(`doc:${doc.id}`, doc); // @crumbs

    crumb("document saved", { id: doc.id }); // @crumbs
  }); // @crumbs
}

export async function getDocument(
  id: string
): Promise<ProcessedDocument | undefined> {
  return crumb.scope("get-document", async () => { // @crumbs
    // Check cache first
    const cached = cacheGet<ProcessedDocument>(`doc:${id}`); // @crumbs
    if (cached) return cached; // @crumbs

    crumb.time("db-read"); // @crumbs
    await simulateLatency(10, 40);
    const doc = documents.get(id);
    crumb.timeEnd("db-read", { found: !!doc }); // @crumbs

    if (doc) cacheSet(`doc:${id}`, doc); // @crumbs
    return doc;
  }); // @crumbs
}

export async function listDocuments(
  page: number,
  pageSize: number
): Promise<PaginatedResult<ProcessedDocument>> {
  return crumb.scope("list-documents", async () => { // @crumbs
    crumb("listing documents", { page, pageSize }); // @crumbs

    crumb.time("db-list"); // @crumbs
    await simulateLatency(15, 50);

    const all = Array.from(documents.values());
    const start = page * pageSize;
    const items = all.slice(start, start + pageSize);

    crumb.timeEnd("db-list", { total: all.length, returned: items.length }); // @crumbs

    return {
      items,
      total: all.length,
      page,
      pageSize,
    };
  }); // @crumbs
}

export async function deleteDocument(id: string): Promise<boolean> {
  return crumb.scope("delete-document", async () => { // @crumbs
    crumb("deleting document", { id }); // @crumbs

    crumb.time("db-delete"); // @crumbs
    await simulateLatency(10, 30);
    const existed = documents.delete(id);
    cache.delete(`doc:${id}`);
    crumb.timeEnd("db-delete", { existed }); // @crumbs

    return existed;
  }); // @crumbs
}

export function getStats() {
  return {
    documentCount: documents.size,
    cacheSize: cache.size,
  };
}
