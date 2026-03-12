import {
  AbsoluteFill,
  useCurrentFrame,
} from "remotion";
import { theme, fonts } from "./theme";
import {
  ClaudeCodeShell,
  ClaudeIcon,
  Dim,
  Bright,
  Err,
} from "./ClaudeCodeShell";
import { CrumbLine } from "./CrumbLine";
import { SyntaxLine, lineLength, type Token } from "./SyntaxLine";

// ── Spinner component ───────────────────────────────────────────────
const Spinner: React.FC<{ frame: number; startFrame: number; verb: string }> = ({ frame, startFrame, verb }) => {
  const elapsed = frame - startFrame;
  const seconds = Math.floor(elapsed / 30);

  return (
    <div>
      <span style={{ color: "#D4A574" }}>{"✻ "}</span>
      <span style={{ color: "#D4A574" }}>{verb}...</span>
      <span style={{ color: theme.comment }}>{` (${seconds}s)`}</span>
    </div>
  );
};

// ── Code tokens from examples/papertrail/src/pipeline.ts ────────────
const codeTokens: Token[][] = [
  [["import", "kw"], [" { ", "punct"], ["trail", "fn"], [" } ", "punct"], ["from", "kw"], [" ", "plain"], ["\"agentcrumbs\"", "str"], [";", "punct"], [" // @crumbs", "cmt"]],
  [],
  [["import", "kw"], [" ", "plain"], ["type", "kw"], [" {", "punct"]],
  [["  Document", "type"], [",", "punct"]],
  [["  DocumentMetadata", "type"], [",", "punct"]],
  [["  DocumentSummary", "type"], [",", "punct"]],
  [["} ", "punct"], ["from", "kw"], [" ", "plain"], ["\"./types.js\"", "str"], [";", "punct"]],
  [["import", "kw"], [" { ", "punct"], ["saveDocument", "fn"], [" } ", "punct"], ["from", "kw"], [" ", "plain"], ["\"./store.js\"", "str"], [";", "punct"]],
  [],
  [["const", "kw"], [" crumb = ", "plain"], ["trail", "fn"], ["(", "punct"], ["\"doc-pipeline\"", "str"], [")", "punct"], [";", "punct"], [" // @crumbs", "cmt"]],
  [],
  [["async", "kw"], [" ", "plain"], ["function", "kw"], [" ", "plain"], ["summarize", "fn"], ["(", "punct"]],
  [["  text", "var"], [": ", "punct"], ["string", "type"], [",", "punct"]],
  [["  metadata", "var"], [": ", "punct"], ["DocumentMetadata", "type"]],
  [["): ", "punct"], ["Promise", "type"], ["<", "punct"], ["DocumentSummary", "type"], ["> {", "punct"]],
  [["  ", "plain"], ["return", "kw"], [" crumb.", "plain"], ["scope", "fn"], ["(", "punct"], ["\"summarize\"", "str"], [", ", "punct"], ["async", "kw"], [" (ctx) => {", "punct"], [" // @crumbs", "cmt"]],
  [["    ctx.", "plain"], ["crumb", "fn"], ["(", "punct"], ["\"calling summarizer\"", "str"], [", {", "punct"], [" // @crumbs", "cmt"]],
  [["      wordCount: metadata.wordCount,", "plain"], [" // @crumbs", "cmt"]],
  [["      topics: metadata.topics,", "plain"], [" // @crumbs", "cmt"]],
  [["    }, { tags: [", "punct"], ["\"ai\"", "str"], ["] });", "punct"], [" // @crumbs", "cmt"]],
  [],
  [["    crumb.", "plain"], ["time", "fn"], ["(", "punct"], ["\"ai-summarize\"", "str"], [");", "punct"], [" // @crumbs", "cmt"]],
  [["    ", "plain"], ["await", "kw"], [" ", "plain"], ["simulateLatency", "fn"], ["(", "punct"], ["200", "num"], [", ", "punct"], ["500", "num"], [");", "punct"]],
];

// ── Crumb trail output ──────────────────────────────────────────────
const crumbData = [
  { ns: "api-gateway", nsColor: theme.nsGreen, msg: "upload request", dt: "+0ms", data: '{ filename: "q3-report.md" }' },
  { ns: "api-gateway", nsColor: theme.nsGreen, msg: "auth success", dt: "+2ms", data: '{ userId: "user_1", role: "admin" }', tags: ["auth"] as string[] },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "starting pipeline", dt: "+3ms", data: '{ id: "doc_0002" }', type: "session:start" as const },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "parse", dt: "+1ms", type: "scope:enter" as const, depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "parse", dt: "+47ms", type: "time" as const, data: "{ duration: 47.1 }", depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "parse", dt: "+1ms", type: "scope:exit" as const, depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "extract-metadata", dt: "+0ms", type: "scope:enter" as const, depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "extracted-metadata", dt: "+117ms", type: "snapshot" as const, data: '{ wordCount: 56, topics: ["engineering"] }', depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "summarize", dt: "+0ms", type: "scope:enter" as const, depth: 1 },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "calling summarizer", dt: "+1ms", data: "{ wordCount: 56 }", depth: 2, tags: ["ai"] as string[] },
  { ns: "doc-pipeline", nsColor: theme.nsCyan, msg: "summarize", dt: "+225ms", type: "scope:error" as const, data: '{ message: "Cannot read properties of undefined" }', depth: 1 },
  { ns: "doc-store", nsColor: theme.nsPink, msg: "save-document", dt: "+0ms", type: "scope:enter" as const },
  { ns: "doc-store", nsColor: theme.nsPink, msg: "save-document", dt: "+1ms", type: "scope:error" as const, data: '{ message: "Cannot read properties of undefined" }' },
];

// ── Timeline ────────────────────────────────────────────────────────
// 30fps × 30s = 900 frames
const userMessage = "the document processing pipeline is crashing when I upload markdown files";

// 76 chars at 2 chars/frame = 38 frames to type, submit at 40
const T = {
  inputStart: 0,       // User starts typing in input bar
  userSubmit: 40,      // User hits enter as soon as typing finishes
  agentMsg1: 55,       // "I'll add crumb tracing..."
  // Spinner: thinking before writing code (4s = 120 frames)
  spinner1: 60,
  writeCall: 180,      // Write(src/pipeline.ts) (replaces spinner)
  writeContent: 182,
  // Spinner: thinking about next step after writing code (2.5s = 75 frames)
  spinner2: 190,
  agentMsg2: 265,      // "Let me run the pipeline..." (replaces spinner)
  bashRun: 270,
  runOutput: 277,
  runProcessing: 287,
  runProcessing2: 297,
  runError: 315,
  runStack: 321,
  // Spinner: analyzing the error (viewer reads the error)
  spinner3: 330,
  agentMsg3: 405,      // "The pipeline crashed..." (replaces spinner)
  bashQuery: 415,
  crumbStart: 423,
  crumbInterval: 4,    // 13 lines × 4 = 52 frames → ends at ~475
  // Spinner: analyzing the trail (viewer scans the crumb output)
  spinner4: 485,
  agentInsight: 555,   // "Found it." (replaces spinner)
  agentInsight2: 557,
  agentMsg4: 625,      // "Bug fixed."
  bashStrip: 630,
  stripOutput: 637,
  cta: 685,
  ctaUrl: 705,
};

const AllContent: React.FC = () => {
  const frame = useCurrentFrame();

  // Step-function scroll — jumps instantly, no animation
  // With flex-end anchoring, content sticks to the bottom automatically.
  // scrollY is only needed to scroll UP and reveal older content that
  // got pushed off the top — i.e., when total content height exceeds
  // the viewport (~692px). We DON'T scroll — we let content grow
  // downward and older stuff naturally disappears off the top.
  // scrollY = 0 always, since flex-end handles it.
  const scrollY = 0;

  // Typewriter for input bar — user is typing before submit, empty after
  const isTyping = frame >= T.inputStart && frame < T.userSubmit;
  const typedChars = Math.min(Math.floor((frame - T.inputStart) * 2), userMessage.length);
  const inputText = isTyping ? userMessage.slice(0, typedChars) : "";

  return (
    <ClaudeCodeShell scrollY={scrollY} showInput inputText={inputText}>
      {/* ── User prompt (appears after submit) ── */}
      {frame >= T.userSubmit && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: theme.green }}>{"❯ "}</span>
          <span style={{ color: theme.fgBright }}>{userMessage}</span>
        </div>
      )}

      {/* ── Agent message 1 ── */}
      {frame >= T.agentMsg1 && (
        <div style={{ marginBottom: 6 }}>
          <ClaudeIcon />
          <span style={{ color: theme.fgBright }}>
            I'll add crumb tracing to the summarize function so we can see what's happening at runtime.
          </span>
        </div>
      )}

      {/* ── Spinner 1: thinking before writing code ── */}
      {frame >= T.spinner1 && frame < T.writeCall && (
        <Spinner frame={frame} startFrame={T.spinner1} verb="Cerebrating" />
      )}
      {frame >= T.writeCall && (
        <div style={{ marginBottom: 4 }}>
          <ClaudeIcon />
          <Bright>Write(</Bright>
          <span style={{ color: theme.string }}>src/pipeline.ts</span>
          <Bright>)</Bright>
        </div>
      )}

      {/* ── Code content ── */}
      {frame >= T.writeContent && (
        <div style={{ paddingLeft: 16, marginBottom: 6 }}>
          <div style={{ borderLeft: `2px solid ${theme.border}`, paddingLeft: 12 }}>
            {codeTokens.map((tokens, i) => (
              <div key={i} style={{ height: 24, whiteSpace: "pre", fontSize: 16 }}>
                <SyntaxLine tokens={tokens} visibleChars={lineLength(tokens)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Spinner 2: thinking after writing code ── */}
      {frame >= T.spinner2 && frame < T.agentMsg2 && (
        <Spinner frame={frame} startFrame={T.spinner2} verb="Gallivanting" />
      )}
      {frame >= T.agentMsg2 && (
        <div style={{ marginTop: 20, marginBottom: 6 }}>
          <ClaudeIcon />
          <span style={{ color: theme.fgBright }}>
            Let me run the pipeline to test the changes.
          </span>
        </div>
      )}

      {/* ── Bash run ── */}
      {frame >= T.bashRun && (
        <div style={{ marginBottom: 4 }}>
          <ClaudeIcon />
          <Bright>Bash(</Bright>
          <span style={{ color: theme.string }}>AGENTCRUMBS=1 pnpm -F papertrail dev</span>
          <Bright>)</Bright>
        </div>
      )}

      {/* ── Run output ── */}
      {frame >= T.runOutput && (
        <div style={{ paddingLeft: 16, marginBottom: 6 }}>
          <div style={{ borderLeft: `2px solid ${theme.border}`, paddingLeft: 12, fontSize: 16 }}>
            <div><Dim>PaperTrail Demo — Document Processing Pipeline</Dim></div>
            {frame >= T.runProcessing && <div><Dim>Processing q3-report.md...</Dim></div>}
            {frame >= T.runProcessing2 && <div><Dim>Processing incident-postmortem.txt...</Dim></div>}
            {frame >= T.runError && (
              <div><Err>Error: Cannot read properties of undefined (reading 'summary')</Err></div>
            )}
            {frame >= T.runStack && (
              <div><Err>{"    at processDocument (src/pipeline.ts:89:24)"}</Err></div>
            )}
          </div>
        </div>
      )}

      {/* ── Spinner 3: analyzing the error (viewer reads the error) ── */}
      {frame >= T.spinner3 && frame < T.agentMsg3 && (
        <Spinner frame={frame} startFrame={T.spinner3} verb="Discombobulating" />
      )}

      {/* ── Agent message 3 ── */}
      {frame >= T.agentMsg3 && (
        <div style={{ marginTop: 20, marginBottom: 6 }}>
          <ClaudeIcon />
          <span style={{ color: theme.fgBright }}>
            The pipeline crashed. Let me check the crumb trail to see what happened.
          </span>
        </div>
      )}

      {/* ── Query call ── */}
      {frame >= T.bashQuery && (
        <div style={{ marginBottom: 4 }}>
          <ClaudeIcon />
          <Bright>Bash(</Bright>
          <span style={{ color: theme.string }}>agentcrumbs query --since 5m</span>
          <Bright>)</Bright>
        </div>
      )}

      {/* ── Crumb trail output ── */}
      {frame >= T.crumbStart && (
        <div style={{ paddingLeft: 16, marginBottom: 6 }}>
          <div style={{ borderLeft: `2px solid ${theme.border}`, paddingLeft: 12 }}>
            {crumbData.map((line, i) => {
              const lineFrame = T.crumbStart + i * T.crumbInterval;
              if (frame < lineFrame) return null;
              const isError = line.type === "scope:error";
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: isError ? "#F8514915" : "transparent",
                    borderRadius: 2,
                    padding: isError ? "0 4px" : 0,
                  }}
                >
                  <CrumbLine {...line} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Spinner 4: analyzing the trail (viewer scans the crumbs) ── */}
      {frame >= T.spinner4 && frame < T.agentInsight && (
        <Spinner frame={frame} startFrame={T.spinner4} verb="Cogitating" />
      )}

      {/* ── Agent insight ── */}
      {frame >= T.agentInsight && (
        <div style={{ marginTop: 16 }}>
          <ClaudeIcon />
          <Bright>Found it.</Bright>
          <span style={{ color: theme.fg }}>
            {" "}The summarize scope errors at +225ms — the AI response
          </span>
        </div>
      )}
      {frame >= T.agentInsight2 && (
        <div style={{ paddingLeft: 20, color: theme.fg }}>
          is missing the expected <Bright>summary</Bright> field. The parse
          and metadata extraction succeeded across all 3 services.
        </div>
      )}

      {/* ── Agent message 4 ── */}
      {frame >= T.agentMsg4 && (
        <div style={{ marginTop: 20, marginBottom: 6 }}>
          <ClaudeIcon />
          <span style={{ color: theme.fgBright }}>
            Bug fixed. Stripping crumbs before merge.
          </span>
        </div>
      )}

      {/* ── Strip call ── */}
      {frame >= T.bashStrip && (
        <div style={{ marginBottom: 4 }}>
          <ClaudeIcon />
          <Bright>Bash(</Bright>
          <span style={{ color: theme.string }}>agentcrumbs strip</span>
          <Bright>)</Bright>
        </div>
      )}

      {/* ── Strip output ── */}
      {frame >= T.stripOutput && (
        <div style={{ paddingLeft: 16 }}>
          <div style={{ borderLeft: `2px solid ${theme.border}`, paddingLeft: 12, fontSize: 16 }}>
            <Dim>Stripped 23 lines from 3 files.</Dim>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      {frame >= T.cta && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: `${theme.green}15`,
              border: `1px solid ${theme.green}40`,
              borderRadius: 8,
              fontSize: 16,
            }}
          >
            <span style={{ color: theme.green, fontWeight: "bold" }}>agentcrumbs</span>
            <span style={{ color: theme.fg }}> — debug mode for </span>
            <span style={{ color: theme.fgBright, fontWeight: "bold" }}>any agent</span>
          </div>
          {frame >= T.ctaUrl && (
            <div style={{ marginTop: 12, fontSize: 13, color: theme.comment }}>
              agentcrumbs.dev
            </div>
          )}
        </div>
      )}
    </ClaudeCodeShell>
  );
};

export const AgentCrumbsDemo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.termBg,
        fontFamily: fonts.mono,
      }}
    >
      <AllContent />
    </AbsoluteFill>
  );
};
