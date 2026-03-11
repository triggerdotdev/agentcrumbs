import { trail } from "agentcrumbs"; // @crumbs

import type { Document, PaginatedResult, ProcessedDocument } from "./types.js";
import { processDocument } from "./pipeline.js";
import { getDocument, listDocuments, deleteDocument, getStats } from "./store.js";

const crumb = trail("api-gateway"); // @crumbs

let nextId = 1;

function generateId(): string {
  return `doc_${String(nextId++).padStart(4, "0")}`;
}

// Fake auth tokens
const validTokens = new Map([
  ["tok_admin_001", { userId: "user_1", role: "admin" as const }],
  ["tok_user_002", { userId: "user_2", role: "viewer" as const }],
]);

type AuthContext = { userId: string; role: "admin" | "viewer" };

function authenticate(token: string | undefined): AuthContext {
  crumb("authenticating", { tokenPrefix: token?.slice(0, 8) }, { tags: ["auth"] }); // @crumbs

  if (!token) {
    crumb("auth failed: no token", undefined, { tags: ["auth", "error"] }); // @crumbs
    throw new Error("Missing authentication token");
  }

  const auth = validTokens.get(token);
  if (!auth) {
    crumb("auth failed: invalid token", { tokenPrefix: token.slice(0, 8) }, { tags: ["auth", "error"] }); // @crumbs
    throw new Error("Invalid authentication token");
  }

  crumb("auth success", { userId: auth.userId, role: auth.role }, { tags: ["auth"] }); // @crumbs
  return auth;
}

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function uploadDocument(
  token: string | undefined,
  filename: string,
  content: string,
  mimeType: string = "text/plain"
): Promise<ApiResponse<ProcessedDocument>> {
  const reqCrumb = crumb.child({ requestId: generateId(), endpoint: "upload" }); // @crumbs

  return reqCrumb.scope("handle-upload", async () => { // @crumbs
    try {
      const auth = authenticate(token);
      reqCrumb("upload request", { // @crumbs
        filename, // @crumbs
        mimeType, // @crumbs
        contentLength: content.length, // @crumbs
        userId: auth.userId, // @crumbs
      }); // @crumbs

      if (auth.role !== "admin") {
        reqCrumb("upload denied: insufficient permissions", { role: auth.role }, { tags: ["auth", "error"] }); // @crumbs
        return { ok: false, error: "Insufficient permissions" };
      }

      const doc: Document = {
        id: generateId(),
        filename,
        content,
        mimeType,
        uploadedAt: new Date().toISOString(),
      };

      reqCrumb("document created", { id: doc.id }); // @crumbs

      crumb.time("full-pipeline"); // @crumbs
      const processed = await processDocument(doc);
      crumb.timeEnd("full-pipeline", { id: doc.id }); // @crumbs

      reqCrumb("upload complete", { id: processed.id }, { tags: ["perf"] }); // @crumbs
      return { ok: true, data: processed };
    } catch (err) {
      reqCrumb("upload error", { // @crumbs
        error: err instanceof Error ? err.message : String(err), // @crumbs
      }, { tags: ["error"] }); // @crumbs
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }); // @crumbs
}

export async function fetchDocument(
  token: string | undefined,
  id: string
): Promise<ApiResponse<ProcessedDocument>> {
  const reqCrumb = crumb.child({ requestId: generateId(), endpoint: "fetch" }); // @crumbs

  return reqCrumb.scope("handle-fetch", async () => { // @crumbs
    try {
      authenticate(token);
      reqCrumb("fetching document", { id }); // @crumbs

      const doc = await getDocument(id);
      if (!doc) {
        reqCrumb("document not found", { id }, { tags: ["error"] }); // @crumbs
        return { ok: false, error: "Document not found" };
      }

      reqCrumb("fetch complete", { id }); // @crumbs
      return { ok: true, data: doc };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }); // @crumbs
}

export async function listAllDocuments(
  token: string | undefined,
  page: number = 0,
  pageSize: number = 10
): Promise<ApiResponse<PaginatedResult<ProcessedDocument>>> {
  const reqCrumb = crumb.child({ requestId: generateId(), endpoint: "list" }); // @crumbs

  return reqCrumb.scope("handle-list", async () => { // @crumbs
    try {
      authenticate(token);
      reqCrumb("listing documents", { page, pageSize }); // @crumbs

      const result = await listDocuments(page, pageSize);

      reqCrumb("list complete", { total: result.total, returned: result.items.length }); // @crumbs
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }); // @crumbs
}

export async function removeDocument(
  token: string | undefined,
  id: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  const reqCrumb = crumb.child({ requestId: generateId(), endpoint: "delete" }); // @crumbs

  return reqCrumb.scope("handle-delete", async () => { // @crumbs
    try {
      const auth = authenticate(token);

      if (auth.role !== "admin") {
        reqCrumb("delete denied: insufficient permissions", { role: auth.role }, { tags: ["auth"] }); // @crumbs
        return { ok: false, error: "Insufficient permissions" };
      }

      reqCrumb("deleting document", { id }); // @crumbs
      const deleted = await deleteDocument(id);

      reqCrumb("delete complete", { id, deleted }); // @crumbs
      return { ok: true, data: { deleted } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }); // @crumbs
}

export function healthCheck(): ApiResponse<{ status: string; stats: ReturnType<typeof getStats> }> {
  const stats = getStats();
  crumb("health check", stats); // @crumbs
  return { ok: true, data: { status: "healthy", stats } };
}
