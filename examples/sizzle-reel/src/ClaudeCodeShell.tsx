import type React from "react";
import { theme, fonts } from "./theme";

type ClaudeCodeShellProps = {
  children: React.ReactNode;
  scrollY?: number;
  inputText?: string;
  showInput?: boolean;
  frame?: number;
};

export const ClaudeCodeShell: React.FC<ClaudeCodeShellProps> = ({
  children,
  scrollY = 0,
  inputText = "",
  showInput = false,
  frame = 0,
}) => {
  // Cost ticks up over time
  const cost = (0.0001 + frame * 0.000008).toFixed(4);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.termBg,
        fontFamily: fonts.mono,
        fontSize: 18,
        lineHeight: 1.55,
        color: theme.fg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Terminal chrome title bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          backgroundColor: theme.bg,
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 7 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FF5F57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FEBC2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28C840" }} />
        </div>

        {/* Center title */}
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, color: theme.comment }}>
          claude — ~/papertrail
        </div>

        {/* Watermark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            opacity: 0.8,
          }}
        >
          <span>
            <span style={{ color: theme.fgBright, fontWeight: "bold" }}>agent</span>
            <span style={{ color: theme.green, fontWeight: "bold" }}>crumbs</span>
          </span>
          <span style={{ color: theme.comment, fontSize: 15 }}>by</span>
          <span style={{ color: theme.comment, fontSize: 15, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="15" height="15" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M41.6889 52.2795L60.4195 20L106.839 100H14L32.7305 67.7195L45.9801 75.3312L40.5003 84.7756H80.3387L60.4195 50.4478L54.9396 59.8922L41.6889 52.2795Z" fill="#A8FF53"/>
            </svg>
            Trigger.dev
          </span>
        </div>
      </div>

      {/* Scrollable content area — content pinned to bottom */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            padding: "0 24px 12px",
            transform: `translateY(${-scrollY}px)`,
          }}
        >
          {children}
        </div>
      </div>

      {/* Input bar */}
      {showInput && (
        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${theme.border}`,
            padding: "10px 20px",
            fontSize: 18,
          }}
        >
          <span style={{ color: theme.comment }}>{"› "}</span>
          <span style={{ color: theme.fgBright }}>{inputText}</span>
          <span
            style={{
              backgroundColor: theme.fg,
              width: 10,
              height: 20,
              display: "inline-block",
              marginLeft: 1,
              verticalAlign: "text-bottom",
            }}
          />
        </div>
      )}

      {/* Footer status bar */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 20,
          paddingRight: 20,
          fontSize: 14,
          color: theme.comment,
        }}
      >
        <div>
          <span style={{ color: theme.green }}>{"▸▸ "}</span>
          <span style={{ color: theme.green }}>accept edits on</span>
          <span>{" (shift+tab to cycle)"}</span>
        </div>
        <div>
          papertrail | Opus 4.6 (1M context) | ${cost}
        </div>
      </div>
    </div>
  );
};

// Styled spans for Claude Code output
export const Prompt: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.green }}>{"❯ "}</span>;

export const ClaudeIcon: React.FC = () => (
  <span style={{ color: "#D4A574" }}>{"⏺ "}</span>
);

export const Dim: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: theme.comment }}>{children}</span>
);

export const Bright: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.fgBright }}>{children}</span>;

export const Keyword: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.keyword }}>{children}</span>;

export const Str: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: theme.string }}>{children}</span>
);

export const Fn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: theme.function }}>{children}</span>
);

export const Comment: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.comment }}>{children}</span>;

export const Type: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.type }}>{children}</span>;

export const Err: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <span style={{ color: theme.error }}>{children}</span>;
