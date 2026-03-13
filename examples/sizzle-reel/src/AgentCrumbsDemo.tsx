import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Sequence,
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

// ── Intro card ──────────────────────────────────────────────────────
const INTRO_FRAMES = 74; // ~2.5s

const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const prefix = "Debug mode for ";
  const accent = "any agent";
  const full = prefix + accent;
  const charsToShow = Math.min(Math.floor(frame * 1.2), full.length);
  const visiblePrefix = full.slice(0, Math.min(charsToShow, prefix.length));
  const visibleAccent = charsToShow > prefix.length ? accent.slice(0, charsToShow - prefix.length) : "";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1b1f",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Fixed position container so logo doesn't move */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 56,
            fontFamily: fonts.mono,
          }}
        >
          <span style={{ fontSize: 80, fontWeight: "bold" }}>
            <span style={{ color: theme.fgBright }}>agent</span>
            <span style={{ color: theme.green, textShadow: `0 0 40px ${theme.green}50, 0 0 80px ${theme.green}25` }}>crumbs</span>
          </span>
          <span style={{ fontSize: 42, color: theme.comment }}>by</span>
          <span style={{ fontSize: 42, color: theme.comment, display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="36" height="36" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M41.6889 52.2795L60.4195 20L106.839 100H14L32.7305 67.7195L45.9801 75.3312L40.5003 84.7756H80.3387L60.4195 50.4478L54.9396 59.8922L41.6889 52.2795Z" fill="#A8FF53"/>
            </svg>
            Trigger.dev
          </span>
        </div>

        {/* Headline — fixed height so it doesn't push logo when typing */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: theme.fgBright,
            textAlign: "center",
            whiteSpace: "nowrap",
            height: 86,
          }}
        >
          {visiblePrefix}<span style={{ color: theme.green, textShadow: `0 0 30px ${theme.green}60, 0 0 60px ${theme.green}30` }}>{visibleAccent}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

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
    <ClaudeCodeShell scrollY={scrollY} showInput inputText={inputText} frame={frame}>
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
              // Error lines flash bright red for 4 frames then settle
              const framesShown = frame - lineFrame;
              const errorBg = isError
                ? framesShown < 2 ? "#F8514940" : framesShown < 4 ? "#F8514928" : "#F8514915"
                : "transparent";
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: errorBg,
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

// ── Fade through black transition ────────────────────────────────────
const FADE_FRAMES = 12;

const FadeOut: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})`, zIndex: 100 }} />
  );
};

const FadeIn: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, FADE_FRAMES], [1, 0], { extrapolateRight: "clamp" });
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})`, zIndex: 100 }} />
  );
};

// ── Vignette overlay ────────────────────────────────────────────────
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
      zIndex: 50,
      pointerEvents: "none",
    }}
  />
);

export const AgentCrumbsDemo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.termBg,
        fontFamily: fonts.mono,
      }}
    >
      {/* Intro card */}
      <Sequence durationInFrames={INTRO_FRAMES}>
        <Intro />
      </Sequence>

      {/* Fade out end of intro */}
      <Sequence from={INTRO_FRAMES - FADE_FRAMES} durationInFrames={FADE_FRAMES}>
        <FadeOut />
      </Sequence>

      {/* Fade in start of terminal */}
      <Sequence from={INTRO_FRAMES} durationInFrames={FADE_FRAMES}>
        <FadeIn />
      </Sequence>

      {/* Terminal session */}
      <Sequence from={INTRO_FRAMES}>
        <AllContent />
      </Sequence>

      {/* Vignette over everything in terminal session */}
      <Sequence from={INTRO_FRAMES}>
        <Vignette />
      </Sequence>
    </AbsoluteFill>
  );
};
