import { useCurrentFrame } from "remotion";

type TypewriterProps = {
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  children?: (visibleText: string) => React.ReactNode;
};

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  startFrame,
  charsPerFrame = 1.5,
  children,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(Math.floor(elapsed * charsPerFrame), text.length);
  const visibleText = text.slice(0, charsToShow);

  if (children) {
    return <>{children(visibleText)}</>;
  }

  return <>{visibleText}</>;
};

type TypewriterLinesProps = {
  lines: string[];
  startFrame: number;
  framesPerLine?: number;
  charsPerFrame?: number;
  renderLine?: (line: string, index: number, visible: boolean) => React.ReactNode;
};

export const TypewriterLines: React.FC<TypewriterLinesProps> = ({
  lines,
  startFrame,
  framesPerLine = 8,
  charsPerFrame = 2,
  renderLine,
}) => {
  const frame = useCurrentFrame();

  return (
    <>
      {lines.map((line, i) => {
        const lineStart = startFrame + i * framesPerLine;
        const elapsed = Math.max(0, frame - lineStart);
        const charsToShow = Math.min(
          Math.floor(elapsed * charsPerFrame),
          line.length
        );
        const visible = frame >= lineStart;
        const visibleText = visible ? line.slice(0, charsToShow) : "";

        if (renderLine) {
          return renderLine(visibleText, i, visible);
        }

        return visible ? <div key={i}>{visibleText}</div> : null;
      })}
    </>
  );
};
