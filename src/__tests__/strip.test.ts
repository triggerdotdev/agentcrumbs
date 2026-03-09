import { describe, it, expect } from "vitest";
import { stripCrumbs } from "../cli/commands/strip.js";

describe("stripCrumbs", () => {
  it("removes single-line markers with // @crumbs", () => {
    const input = [
      'import { trail } from "agentcrumbs"; // @crumbs',
      'const crumb = trail("auth"); // @crumbs',
      "",
      "function handleAuth(token: string) {",
      '  crumb("validating", { token }); // @crumbs',
      "  return validate(token);",
      "}",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(3);
    expect(result.output).toBe(
      [
        "",
        "function handleAuth(token: string) {",
        "  return validate(token);",
        "}",
      ].join("\n")
    );
  });

  it("removes single-line markers with /* @crumbs */", () => {
    const input = [
      'import { trail } from "agentcrumbs"; /* @crumbs */',
      'const crumb = trail("svc"); /* @crumbs */',
      "",
      "const x = 1;",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(2);
    expect(result.output).toContain("const x = 1;");
    expect(result.output).not.toContain("agentcrumbs");
  });

  it("removes #region @crumbs blocks", () => {
    const input = [
      "function process() {",
      "  // #region @crumbs",
      '  crumb("starting process");',
      '  crumb.time("process");',
      "  // #endregion @crumbs",
      "  doWork();",
      "  // #region @crumbs",
      '  crumb.timeEnd("process");',
      "  // #endregion @crumbs",
      "  return result;",
      "}",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(7);
    expect(result.output).toBe(
      [
        "function process() {",
        "  doWork();",
        "  return result;",
        "}",
      ].join("\n")
    );
  });

  it("handles mixed single-line and region markers", () => {
    const input = [
      '  import { trail } from "agentcrumbs"; // @crumbs',
      '  const crumb = trail("svc"); // @crumbs',
      "",
      "function run() {",
      "  // #region @crumbs",
      '  const session = crumb.session("debug");',
      "  // #endregion @crumbs",
      '  crumb("checkpoint", { step: 1 }); // @crumbs',
      "  doStuff();",
      "}",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBeGreaterThanOrEqual(5);
    expect(result.output).not.toContain("agentcrumbs");
    expect(result.output).not.toContain("crumb");
    expect(result.output).toContain("doStuff();");
  });

  it("returns zero lines removed when no markers exist", () => {
    const input = [
      "function add(a: number, b: number) {",
      "  return a + b;",
      "}",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(0);
    expect(result.output).toBe(input);
  });

  it("collapses consecutive blank lines after removal", () => {
    const input = [
      'import { trail } from "agentcrumbs"; // @crumbs',
      "",
      "",
      "const x = 1;",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(1);
    // Should collapse the double blank into single
    expect(result.output).toBe(["", "const x = 1;"].join("\n"));
  });

  it("handles indented region markers", () => {
    const input = [
      "class Service {",
      "  process() {",
      "    // #region @crumbs",
      '    crumb("inside method");',
      "    // #endregion @crumbs",
      "    return true;",
      "  }",
      "}",
    ].join("\n");

    const result = stripCrumbs(input);
    expect(result.linesRemoved).toBe(3);
    expect(result.output).toContain("return true;");
    expect(result.output).not.toContain("crumb");
  });
});
