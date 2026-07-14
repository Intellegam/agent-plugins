/** The line map: per-file hunk headers with old/new ranges, and each row tagged with its numbers. */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderMap } from "../scripts/map.ts";

const FIXTURES = resolve(import.meta.dir, "../../../tests/fixtures");
const map = renderMap(readFileSync(resolve(FIXTURES, "example.diff"), "utf8"));

describe("line map", () => {
  test("prints each hunk's header with old/new ranges", () => {
    expect(map).toContain("notifier/send.py");
    expect(map).toContain("hunk 2  @@ -10,4 +12,11 @@");
    expect(map).toContain("(old 10-13, new 12-22)");
    // an added file has no old side
    expect(map).toContain("notifier/config.py");
    expect(map).toContain("(old none, new 1-5)");
  });

  test("tags each row with its new-side line number", () => {
    // the retry loop is inserted at new line 14 (content keeps its own indentation)
    expect(map).toMatch(/14 \+\s+for attempt in range\(MAX_RETRIES\):/);
  });
});
