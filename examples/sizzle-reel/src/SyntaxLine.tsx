import type React from "react";
import { theme } from "./theme";

// Pre-tokenized code: each token is [text, colorKey]
// colorKey maps to theme colors
type Token = [string, "kw" | "fn" | "str" | "cmt" | "var" | "type" | "num" | "plain" | "punct"];

const colorMap: Record<Token[1], string> = {
  kw: theme.keyword,
  fn: theme.function,
  str: theme.string,
  cmt: theme.comment,
  var: theme.variable,
  type: theme.type,
  num: theme.number,
  plain: theme.fg,
  punct: theme.fg,
};

type SyntaxLineProps = {
  tokens: Token[];
  visibleChars: number;
};

export const SyntaxLine: React.FC<SyntaxLineProps> = ({ tokens, visibleChars }) => {
  let charsRendered = 0;

  return (
    <>
      {tokens.map(([text, colorKey], i) => {
        if (charsRendered >= visibleChars) return null;

        const remaining = visibleChars - charsRendered;
        const visible = text.slice(0, remaining);
        charsRendered += text.length;

        return (
          <span key={i} style={{ color: colorMap[colorKey] }}>
            {visible}
          </span>
        );
      })}
    </>
  );
};

// Helper to count total chars in a token line
export function lineLength(tokens: Token[]): number {
  return tokens.reduce((sum, [text]) => sum + text.length, 0);
}

export type { Token };
