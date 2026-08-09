/**
 * Diff helpers for the code-tour renderer.
 *
 * `pr.diff` is parsed with react-diff-view's `parseDiff` (gitdiff-parser structures) — no
 * custom parser. This module adds only what rendering needs: a canonical-path lookup, a
 * slice helper that carves a sub-hunk out of one parsed hunk, and reference resolution that
 * turns a `<Diff>` reference into the hunk to render (or a readable failure message).
 */

import { parseDiff, type ChangeData, type FileData, type HunkData } from "react-diff-view";

export type Side = "old" | "new";

export interface LineRange {
  side: Side;
  start: number;
  end: number;
}

export function parse(diffText: string): FileData[] {
  return parseDiff(diffText);
}

export interface ChangeCount {
  added: number;
  removed: number;
}

export interface ChangedLine {
  file: string;
  side: Side;
  line: number;
}

/** Stable identity for one changed row. Git paths cannot contain NUL, so this is unambiguous. */
export function changedLineKey({ file, side, line }: ChangedLine): string {
  return `${file}\0${side}\0${line}`;
}

/** Inserted/deleted rows shown by a resolved whole or sliced hunk. Context never counts. */
export function changedLines(file: FileData, hunk: HunkData): ChangedLine[] {
  const path = pathOf(file);
  const lines: ChangedLine[] = [];
  for (const change of hunk.changes) {
    if (change.type === "insert") lines.push({ file: path, side: "new", line: change.lineNumber });
    else if (change.type === "delete") lines.push({ file: path, side: "old", line: change.lineNumber });
  }
  return lines;
}

/** Every changed row in the source diff, with old/new rows kept distinct. */
export function changedLinesInFiles(files: FileData[]): ChangedLine[] {
  return files.flatMap((file) => file.hunks.flatMap((hunk) => changedLines(file, hunk)));
}

/** Changed lines in one hunk: added + removed rows (context/`normal` rows don't count). */
export function countHunk(hunk: HunkData): ChangeCount {
  let added = 0;
  let removed = 0;
  for (const change of hunk.changes) {
    if (change.type === "insert") added += 1;
    else if (change.type === "delete") removed += 1;
  }
  return { added, removed };
}

/** Changed lines across every hunk of every file in the parsed diff — the whole PR's churn. */
export function countFiles(files: FileData[]): ChangeCount {
  const total: ChangeCount = { added: 0, removed: 0 };
  for (const file of files) {
    for (const hunk of file.hunks) {
      const count = countHunk(hunk);
      total.added += count.added;
      total.removed += count.removed;
    }
  }
  return total;
}

/** The path as it appears in pr.diff: the new path, or the old path for deleted files. */
export function pathOf(file: FileData): string {
  return file.type === "delete" ? file.oldPath : file.newPath;
}

export function lineOf(change: ChangeData, side: Side): number | null {
  if (side === "new") {
    if (change.type === "insert") return change.lineNumber;
    if (change.type === "normal") return change.newLineNumber;
    return null;
  }
  if (change.type === "delete") return change.lineNumber;
  if (change.type === "normal") return change.oldLineNumber;
  return null;
}

/**
 * Rebuild a valid single-file patch from a resolved hunk. The source rows still come from
 * pr.diff; this merely adds the file headers Pierre needs around a whole or sliced hunk.
 */
export function patchFor(file: FileData, hunk: HunkData): string {
  const oldPath = file.type === "add" ? "/dev/null" : `a/${file.oldPath}`;
  const newPath = file.type === "delete" ? "/dev/null" : `b/${file.newPath}`;
  const body = hunk.changes
    .map((change) => {
      const prefix = change.type === "insert" ? "+" : change.type === "delete" ? "-" : " ";
      return `${prefix}${change.content}`;
    })
    .join("\n");

  return [
    `diff --git a/${file.oldPath} b/${file.newPath}`,
    `--- ${oldPath}`,
    `+++ ${newPath}`,
    hunk.content,
    body,
    "",
  ].join("\n");
}

/** The change a given `{side, line}` points at, if the hunk shows it (for annotations). */
export function changeAt(hunk: HunkData, side: Side, line: number): ChangeData | undefined {
  return hunk.changes.find((c) => lineOf(c, side) === line);
}

function sideRange(hunk: HunkData, side: Side): [number, number] {
  return side === "old"
    ? [hunk.oldStart, hunk.oldStart + hunk.oldLines - 1]
    : [hunk.newStart, hunk.newStart + hunk.newLines - 1];
}

/**
 * Carve a sub-hunk out of one parsed hunk: the rows whose {side} line numbers fall in
 * [start, end], plus opposite-side rows strictly between them (so a deletion interleaved
 * with the shown additions is never silently dropped). Rebuilds a corrected `@@` header.
 */
export function sliceHunk(hunk: HunkData, { side, start, end }: LineRange): HunkData {
  const hit: number[] = [];
  hunk.changes.forEach((c, i) => {
    const ln = lineOf(c, side);
    if (ln !== null && ln >= start && ln <= end) hit.push(i);
  });
  const changes = hit.length === 0 ? [] : hunk.changes.slice(hit[0], hit[hit.length - 1] + 1);

  const olds = changes.map((c) => lineOf(c, "old")).filter((n): n is number => n !== null);
  const news = changes.map((c) => lineOf(c, "new")).filter((n): n is number => n !== null);
  const oldStart = olds.length ? Math.min(...olds) : hunk.oldStart;
  const newStart = news.length ? Math.min(...news) : hunk.newStart;
  return {
    content: `@@ -${oldStart},${olds.length} +${newStart},${news.length} @@`,
    oldStart,
    oldLines: olds.length,
    newStart,
    newLines: news.length,
    changes,
  };
}

export type Resolved =
  | { ok: true; file: FileData; hunk: HunkData }
  | { ok: false; error: string };

/** Resolve a `<Diff>` reference to the hunk to render, or a readable failure message. */
export function resolveRef(
  files: FileData[],
  file: string,
  ref: { hunk?: number; lines?: LineRange },
): Resolved {
  const fd = files.find((f) => pathOf(f) === file);
  if (!fd) return { ok: false, error: `${file}: does not appear in pr.diff` };

  if ((ref.hunk === undefined) === (ref.lines === undefined)) {
    return { ok: false, error: `${file}: specify exactly one of hunk={n} or lines={...}` };
  }

  if (ref.hunk !== undefined) {
    const n = ref.hunk;
    if (n < 1 || n > fd.hunks.length) {
      const has = fd.hunks.length;
      return { ok: false, error: `${file}: hunk ${n} does not exist (file has ${has} hunk${has === 1 ? "" : "s"})` };
    }
    return { ok: true, file: fd, hunk: fd.hunks[n - 1] };
  }

  const { side, start, end } = ref.lines!;
  if (side !== "old" && side !== "new") {
    return { ok: false, error: `${file}: lines.side must be "old" or "new"` };
  }
  if (end < start) {
    return { ok: false, error: `${file}: lines ${start}-${end} are reversed (end before start)` };
  }
  const container = fd.hunks.find((h) => {
    const [s, e] = sideRange(h, side);
    return start >= s && end <= e;
  });
  if (!container) {
    return { ok: false, error: `${file}: ${side} lines ${start}-${end} are not within a single hunk` };
  }
  return { ok: true, file: fd, hunk: sliceHunk(container, ref.lines!) };
}
