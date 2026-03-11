export type Document = {
  id: string;
  filename: string;
  content: string;
  mimeType: string;
  uploadedAt: string;
};

export type DocumentMetadata = {
  wordCount: number;
  language: string;
  topics: string[];
  sentiment: "positive" | "negative" | "neutral";
};

export type DocumentSummary = {
  title: string;
  summary: string;
  keyPoints: string[];
};

export type ProcessedDocument = {
  id: string;
  document: Document;
  metadata: DocumentMetadata;
  summary: DocumentSummary;
  processedAt: string;
};

export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
