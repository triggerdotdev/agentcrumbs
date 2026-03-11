import {
  uploadDocument,
  fetchDocument,
  listAllDocuments,
  removeDocument,
  healthCheck,
} from "./api.js";

const ADMIN_TOKEN = "tok_admin_001";
const VIEWER_TOKEN = "tok_user_002";

function log(label: string, data: unknown) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(data, null, 2));
}

async function run() {
  console.log("PaperTrail Demo — Document Processing Pipeline\n");

  // Health check
  log("Health Check", healthCheck());

  // Upload a few documents
  const doc1 = await uploadDocument(
    ADMIN_TOKEN,
    "q3-report.md",
    `## Q3 Revenue Report

The quarterly revenue showed excellent growth across all segments.
Server infrastructure costs declined by 12% due to improved deployment automation.
The engineering team shipped 47 features and resolved 183 bugs.
User feedback has been overwhelmingly positive about the new dashboard design.
Overall profit margins improved to 34%, exceeding our target by 6 points.`,
    "text/markdown"
  );
  log("Upload doc1", doc1);

  const doc2 = await uploadDocument(
    ADMIN_TOKEN,
    "incident-postmortem.txt",
    `On March 3rd the primary database server experienced a connection pool exhaustion issue.
The problem was caused by a missing connection timeout in the API gateway code.
This resulted in 23 minutes of degraded performance for approximately 8000 users.
The team identified the root cause within 7 minutes and deployed a hotfix.
We have since added connection pool monitoring and alerting to prevent recurrence.
The risk of this happening again is low but we recommend a full review of all timeout configurations.`,
    "text/plain"
  );
  log("Upload doc2", doc2);

  const doc3 = await uploadDocument(
    ADMIN_TOKEN,
    "product-roadmap.txt",
    `Product Roadmap Q4 2026

Launch the redesigned user onboarding flow by October 15th.
Ship the API v3 endpoints with improved rate limiting and authentication.
Deploy the new feature flag system for gradual rollouts.
Collect user feedback on the search improvements launched last quarter.
The design team will finalize the component library documentation.`,
    "text/plain"
  );
  log("Upload doc3", doc3);

  // Try uploading as a viewer (should fail)
  const denied = await uploadDocument(
    VIEWER_TOKEN,
    "secret.txt",
    "this should not work",
  );
  log("Upload as viewer (should fail)", denied);

  // Try with no token
  const noAuth = await uploadDocument(undefined, "nope.txt", "no token");
  log("Upload with no token (should fail)", noAuth);

  // Fetch a document (cache hit on second fetch)
  if (doc1.data) {
    const fetched1 = await fetchDocument(ADMIN_TOKEN, doc1.data.id);
    log("Fetch doc1 (first - from cache)", fetched1);

    const fetched2 = await fetchDocument(VIEWER_TOKEN, doc1.data.id);
    log("Fetch doc1 (second - cache hit)", fetched2);
  }

  // List all documents
  const all = await listAllDocuments(ADMIN_TOKEN, 0, 2);
  log("List documents (page 0, size 2)", all);

  const page2 = await listAllDocuments(ADMIN_TOKEN, 1, 2);
  log("List documents (page 1, size 2)", page2);

  // Delete a document
  if (doc2.data) {
    const deleted = await removeDocument(ADMIN_TOKEN, doc2.data.id);
    log("Delete doc2", deleted);
  }

  // Final health check
  log("Final Health Check", healthCheck());

  console.log("\n--- Done ---");
}

run().catch(console.error);
