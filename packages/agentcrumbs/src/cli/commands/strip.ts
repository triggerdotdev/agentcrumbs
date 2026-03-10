import fs from "node:fs";
import path from "node:path";
import { getFlag, hasFlag } from "../args.js";

const SINGLE_LINE_MARKER = /\/[/*]\s*@crumbs\s*\*?\/?$/;
const REGION_START = /^\s*\/\/\s*#region\s+@crumbs\s*$/;
const REGION_END = /^\s*\/\/\s*#endregion\s+@crumbs\s*$/;

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
const DEFAULT_IGNORE = ["node_modules", "dist", ".git", ".next", ".turbo"];

export async function strip(args: string[]): Promise<void> {
  const check = hasFlag(args, "--check");
  const dryRun = hasFlag(args, "--dry-run");
  const dir = getFlag(args, "--dir") ?? process.cwd();
  const extFlag = getFlag(args, "--ext");
  const extensions = extFlag
    ? extFlag.split(",").map((e) => (e.startsWith(".") ? e : `.${e}`))
    : DEFAULT_EXTENSIONS;

  const files = findFiles(dir, extensions);

  let totalLinesRemoved = 0;
  let totalFilesChanged = 0;
  const changedFiles: { file: string; linesRemoved: number }[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const result = stripCrumbs(content);

    if (result.linesRemoved > 0) {
      totalLinesRemoved += result.linesRemoved;
      totalFilesChanged++;
      const relPath = path.relative(dir, file);
      changedFiles.push({ file: relPath, linesRemoved: result.linesRemoved });

      if (!check && !dryRun) {
        fs.writeFileSync(file, result.output);
      }
    }
  }

  if (changedFiles.length === 0) {
    process.stdout.write("No crumb markers found.\n");
    return;
  }

  for (const { file, linesRemoved } of changedFiles) {
    const prefix = check ? "  found" : dryRun ? "  would strip" : "  stripped";
    process.stdout.write(`${prefix} ${linesRemoved} line${linesRemoved === 1 ? "" : "s"} in ${file}\n`);
  }

  process.stdout.write(
    `\n${totalFilesChanged} file${totalFilesChanged === 1 ? "" : "s"}, ${totalLinesRemoved} line${totalLinesRemoved === 1 ? "" : "s"}${check ? " found" : dryRun ? " would be removed" : " removed"}\n`
  );

  if (check && totalLinesRemoved > 0) {
    process.stderr.write("\nCrumb markers detected. Run `agentcrumbs strip` to remove them.\n");
    process.exit(1);
  }
}

export function stripCrumbs(content: string): {
  output: string;
  linesRemoved: number;
} {
  const lines = content.split("\n");
  const output: string[] = [];
  let linesRemoved = 0;
  let inRegion = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (REGION_START.test(line)) {
      inRegion = true;
      linesRemoved++;
      continue;
    }

    if (REGION_END.test(line)) {
      inRegion = false;
      linesRemoved++;
      // Remove trailing blank line after region end
      continue;
    }

    if (inRegion) {
      linesRemoved++;
      continue;
    }

    if (SINGLE_LINE_MARKER.test(line)) {
      linesRemoved++;
      continue;
    }

    output.push(line);
  }

  // Clean up consecutive blank lines left by removal
  const cleaned = collapseBlankLines(output);

  return { output: cleaned.join("\n"), linesRemoved };
}

function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let prevBlank = false;

  for (const line of lines) {
    const isBlank = line.trim() === "";
    if (isBlank && prevBlank) continue;
    result.push(line);
    prevBlank = isBlank;
  }

  return result;
}

function findFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  function walk(d: string) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE.includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}
