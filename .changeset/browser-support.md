---
"agentcrumbs": minor
---

Add browser support via tshy `esmDialects`. Bundlers that respect the `"browser"` export condition (Vite, webpack, esbuild, Next.js) automatically resolve to the browser build. Same `"agentcrumbs"` import path — no separate entry point. Adds `configure()` API for enabling tracing in the browser.
