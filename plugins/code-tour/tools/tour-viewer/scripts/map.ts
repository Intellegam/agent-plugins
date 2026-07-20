#!/usr/bin/env bun
/**
 * code-tour line map. Prints, per file in `pr.diff`, each hunk's index + `@@` header and every
 * row with its old- and new-side line numbers — exactly the numbers you need to write
 * `<Diff lines={{ side, start, end }}>` slices and `<Annotation line={n} side>` targets, without
 * opening the checked-out file (which the "reference pr.diff, never write code" rule discourages).
 *
 *   bun run map.ts [workspaceDir] [--diff PATH]      # defaults to ./pr.diff
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { lineOf, parse, pathOf } from "../src/diff.ts";

function pad(n: number | null): string {
  return (n === null ? "" : String(n)).padStart(6);
}

function range(start: number, lines: number): string {
  // A pure add/delete hunk uses `-0,0` / `+0,0`: start 0 means that side has no lines.
  return start > 0 && lines > 0 ? `${start}-${start + lines - 1}` : "none";
}

/** The line map for a raw diff, as printable text. */
export function renderMap(diffText: string): string {
  const files = parse(diffText);
  const out: string[] = [];
  for (const file of files) {
    out.push(pathOf(file));
    file.hunks.forEach((hunk, i) => {
      out.push(
        `  hunk ${i + 1}  ${hunk.content}  ` +
          `(old ${range(hunk.oldStart, hunk.oldLines)}, new ${range(hunk.newStart, hunk.newLines)})`,
      );
      for (const change of hunk.changes) {
        const marker = change.type === "insert" ? "+" : change.type === "delete" ? "-" : " ";
        out.push(`    ${pad(lineOf(change, "old"))} ${pad(lineOf(change, "new"))} ${marker} ${change.content}`);
      }
    });
    out.push("");
  }
  return out.join("\n");
}

function main(): number {
  let workspace: string | null = null;
  let diffArg: string | null = null;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--diff") diffArg = argv[++i];
    else if (!argv[i].startsWith("--")) workspace = argv[i];
  }
  const dir = workspace ? resolve(workspace) : process.cwd();
  const diff = diffArg ? resolve(diffArg) : resolve(dir, "pr.diff");

  if (!existsSync(diff)) {
    console.error(`diff not found: ${diff}`);
    return 2;
  }
  const text = readFileSync(diff, "utf8");
  if (parse(text).length === 0) {
    console.error(`no files parsed from ${diff} — is it a raw git diff?`);
    return 1;
  }
  console.log(renderMap(text));
  return 0;
}

if (import.meta.main) process.exit(main());
