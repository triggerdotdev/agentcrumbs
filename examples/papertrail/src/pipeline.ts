import { trail } from "agentcrumbs"; // @crumbs

import type {
  Document,
  DocumentMetadata,
  DocumentSummary,
  ProcessedDocument,
} from "./types.js";
import { saveDocument } from "./store.js";

const crumb = trail("doc-pipeline"); // @crumbs

function simulateLatency(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseDocument(doc: Document): Promise<string> {
  return crumb.scope("parse", async (ctx) => { // @crumbs
    ctx.crumb("parsing document", { // @crumbs
      filename: doc.filename, // @crumbs
      mimeType: doc.mimeType, // @crumbs
      contentLength: doc.content.length, // @crumbs
    }); // @crumbs

    crumb.assert(doc.content.length > 0, "document content is empty"); // @crumbs
    crumb.assert(doc.content.length < 1_000_000, "document exceeds 1MB limit"); // @crumbs

    crumb.time("parse"); // @crumbs
    await simulateLatency(30, 100);

    // Simulate parsing based on mime type
    let parsed: string;
    if (doc.mimeType === "text/plain") {
      parsed = doc.content;
    } else if (doc.mimeType === "text/markdown") {
      // Strip markdown syntax (simplified)
      parsed = doc.content
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "");
    } else {
      parsed = doc.content; // fallback
    }

    crumb.timeEnd("parse", { parsedLength: parsed.length }); // @crumbs
    return parsed;
  }); // @crumbs
}

async function extractMetadata(text: string): Promise<DocumentMetadata> {
  return crumb.scope("extract-metadata", async () => { // @crumbs
    crumb.time("metadata-extraction"); // @crumbs
    await simulateLatency(50, 150);

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Fake topic extraction
    const topicKeywords: Record<string, string[]> = {
      engineering: ["api", "server", "database", "deploy", "code", "function"],
      finance: ["revenue", "cost", "budget", "quarterly", "profit", "margin"],
      product: ["user", "feature", "roadmap", "launch", "feedback", "design"],
    };

    const lowerText = text.toLowerCase();
    const topics = Object.entries(topicKeywords)
      .filter(([, keywords]) => keywords.some((kw) => lowerText.includes(kw)))
      .map(([topic]) => topic);

    // Fake sentiment
    const positiveWords = ["great", "excellent", "improved", "success", "growth"];
    const negativeWords = ["failed", "issue", "problem", "declined", "risk"];
    const posCount = positiveWords.filter((w) => lowerText.includes(w)).length;
    const negCount = negativeWords.filter((w) => lowerText.includes(w)).length;
    const sentiment =
      posCount > negCount
        ? "positive"
        : negCount > posCount
          ? "negative"
          : "neutral";

    const metadata: DocumentMetadata = {
      wordCount,
      language: "en",
      topics: topics.length > 0 ? topics : ["general"],
      sentiment,
    };

    crumb.timeEnd("metadata-extraction"); // @crumbs
    crumb.snapshot("extracted-metadata", metadata); // @crumbs

    return metadata;
  }); // @crumbs
}

async function summarize(
  text: string,
  metadata: DocumentMetadata
): Promise<DocumentSummary> {
  return crumb.scope("summarize", async (ctx) => { // @crumbs
    ctx.crumb("calling summarizer", { // @crumbs
      wordCount: metadata.wordCount, // @crumbs
      topics: metadata.topics, // @crumbs
    }, { tags: ["ai"] }); // @crumbs

    crumb.time("ai-summarize"); // @crumbs
    // Simulate AI API call latency
    await simulateLatency(200, 500);

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    const title =
      sentences[0]?.trim().slice(0, 80) || "Untitled Document";

    const summary =
      sentences.length > 2
        ? sentences.slice(0, 3).join(". ").trim() + "."
        : text.slice(0, 200);

    const keyPoints = sentences
      .filter((_, i) => i % Math.max(1, Math.floor(sentences.length / 3)) === 0)
      .slice(0, 5)
      .map((s) => s.trim());

    crumb.timeEnd("ai-summarize", { // @crumbs
      titleLength: title.length, // @crumbs
      keyPointCount: keyPoints.length, // @crumbs
    }); // @crumbs

    return { title, summary, keyPoints };
  }); // @crumbs
}

export async function processDocument(doc: Document): Promise<ProcessedDocument> {
  const session = crumb.session("process-doc"); // @crumbs
  session.crumb("starting pipeline", { id: doc.id, filename: doc.filename }); // @crumbs

  try {
    // Stage 1: Parse
    const parsed = await parseDocument(doc);

    // #region @crumbs
    crumb.snapshot("after-parse", {
      id: doc.id,
      parsedLength: parsed.length,
      preview: parsed.slice(0, 100),
    });
    // #endregion @crumbs

    // Stage 2: Extract metadata
    const metadata = await extractMetadata(parsed);

    // Stage 3: Summarize
    const summary = await summarize(parsed, metadata);

    // #region @crumbs
    crumb.snapshot("after-summarize", {
      id: doc.id,
      title: summary.title,
      keyPointCount: summary.keyPoints.length,
      sentiment: metadata.sentiment,
    });
    // #endregion @crumbs

    const processed: ProcessedDocument = {
      id: doc.id,
      document: doc,
      metadata,
      summary,
      processedAt: new Date().toISOString(),
    };

    // Stage 4: Store
    await saveDocument(processed);

    session.crumb("pipeline complete", { id: doc.id }); // @crumbs
    session.end(); // @crumbs

    return processed;
  } catch (err) {
    session.crumb("pipeline failed", { // @crumbs
      id: doc.id, // @crumbs
      error: err instanceof Error ? err.message : String(err), // @crumbs
    }); // @crumbs
    session.end(); // @crumbs
    throw err;
  }
}
