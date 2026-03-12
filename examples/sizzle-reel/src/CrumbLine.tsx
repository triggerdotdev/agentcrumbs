import type React from "react";
import { theme } from "./theme";

type CrumbLineProps = {
  ns: string;
  nsColor: string;
  msg: string;
  dt: string;
  data?: string;
  depth?: number;
  type?: "crumb" | "scope:enter" | "scope:exit" | "scope:error" | "time" | "snapshot" | "session:start";
  tags?: string[];
  sid?: string;
};

export const CrumbLine: React.FC<CrumbLineProps> = ({
  ns,
  nsColor,
  msg,
  dt,
  data,
  depth = 0,
  type = "crumb",
  tags,
}) => {
  const pad = "  ".repeat(depth);
  const dtStyle = { color: theme.comment };

  let msgDisplay: React.ReactNode;

  switch (type) {
    case "scope:enter":
      msgDisplay = (
        <>
          {pad}
          <span style={{ fontWeight: "bold" }}>[{msg}]</span>{" "}
          <span style={dtStyle}>→</span> enter
        </>
      );
      break;
    case "scope:exit":
      msgDisplay = (
        <>
          {pad}
          <span style={{ fontWeight: "bold" }}>[{msg}]</span>{" "}
          <span style={dtStyle}>←</span> exit
        </>
      );
      break;
    case "scope:error":
      msgDisplay = (
        <>
          {pad}
          <span style={{ fontWeight: "bold" }}>[{msg}]</span>{" "}
          <span style={{ color: theme.error }}>!!</span>{" "}
          <span style={{ color: theme.error }}>error</span>
        </>
      );
      break;
    case "time":
      msgDisplay = (
        <>
          {pad}
          <span style={dtStyle}>time:</span> {msg}
        </>
      );
      break;
    case "snapshot":
      msgDisplay = (
        <>
          {pad}
          <span style={dtStyle}>snapshot:</span> {msg}
        </>
      );
      break;
    case "session:start":
      msgDisplay = (
        <>
          {pad}
          <span style={{ fontWeight: "bold" }}>session start:</span> {msg}
        </>
      );
      break;
    default:
      msgDisplay = (
        <>
          {pad}
          {msg}
        </>
      );
  }

  return (
    <div style={{ whiteSpace: "pre", fontSize: 16, lineHeight: 1.5 }}>
      <span style={{ color: nsColor, display: "inline-block", width: 140 }}>
        {ns}
      </span>
      {" "}
      <span style={{ color: theme.fgBright }}>{msgDisplay}</span>
      {" "}
      <span style={dtStyle}>{dt}</span>
      {tags && tags.length > 0 && (
        <span style={dtStyle}> [{tags.join(", ")}]</span>
      )}
      {data && (
        <span style={{ color: theme.comment }}> {data}</span>
      )}
    </div>
  );
};
