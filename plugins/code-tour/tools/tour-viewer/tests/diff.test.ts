/** Slice helper + reference resolution — the rendering semantics the tour depends on. */

import { describe, expect, test } from "bun:test";
import { parse, resolveRef } from "../src/diff.ts";

// app.py hunk 1: [normal, del old2, add new2, normal] — a delete interleaved with the new-side
// rows. hunk 2: [del old10, add new10, del old11] — an insert between two deletes.
const DIFF = `diff --git a/app.py b/app.py
index 1111111..2222222 100644
--- a/app.py
+++ b/app.py
@@ -1,3 +1,3 @@
 import os
-TIMEOUT = 30
+TIMEOUT = 60
 DEBUG = False
@@ -10,2 +10,1 @@ def main():
-alpha
+beta
-gamma
`;

const files = parse(DIFF);
const kinds = (r: ReturnType<typeof resolveRef>) => (r.ok ? r.hunk.changes.map((c) => c.type) : r.error);

describe("resolveRef / sliceHunk", () => {
  test("whole hunk returns every row", () => {
    const r = resolveRef(files, "app.py", { hunk: 1 });
    expect(kinds(r)).toEqual(["normal", "delete", "insert", "normal"]);
  });

  test("new-side slice keeps a deletion interleaved between shown additions", () => {
    // new 1-2 spans the context (new 1) through the add (new 2); the delete of old 2 sits
    // strictly between and must NOT be dropped.
    const r = resolveRef(files, "app.py", { lines: { side: "new", start: 1, end: 2 } });
    expect(kinds(r)).toEqual(["normal", "delete", "insert"]);
    expect(r.ok && r.hunk.content).toBe("@@ -1,2 +1,2 @@");
  });

  test("new-side slice at the add alone excludes the preceding deletion", () => {
    const r = resolveRef(files, "app.py", { lines: { side: "new", start: 2, end: 2 } });
    expect(kinds(r)).toEqual(["insert"]);
  });

  test("old-side slice keeps an insertion interleaved between shown deletions", () => {
    const r = resolveRef(files, "app.py", { lines: { side: "old", start: 10, end: 11 } });
    expect(kinds(r)).toEqual(["delete", "insert", "delete"]);
  });

  test("broken references report readable errors", () => {
    expect(resolveRef(files, "ghost.py", { hunk: 1 })).toMatchObject({ ok: false });
    const badHunk = resolveRef(files, "app.py", { hunk: 9 });
    expect(badHunk.ok).toBe(false);
    expect(!badHunk.ok && badHunk.error).toContain("file has 2 hunks");
    const crossHunk = resolveRef(files, "app.py", { lines: { side: "new", start: 2, end: 10 } });
    expect(!crossHunk.ok && crossHunk.error).toContain("not within a single hunk");
  });
});
