/** End-to-end build: a broken reference fails, and the demo fixture bundles to tour.html. */

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, linkSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BUILD = resolve(import.meta.dir, "../scripts/build.ts");
const FIXTURES = resolve(import.meta.dir, "../../../tests/fixtures");
const PLUGIN_ROOT = resolve(import.meta.dir, "../../..");
const DIFF = resolve(FIXTURES, "example.diff");

const OUT = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-out-"));
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

function build(tour: string, out: string, diff = DIFF) {
  const r = Bun.spawnSync(["bun", BUILD, "--tour", tour, "--diff", diff, "--out", out], {
    cwd: PLUGIN_ROOT,
  });
  return { code: r.exitCode, stderr: r.stderr.toString() };
}

describe("build", () => {
  test("a broken diff reference fails the build with a readable message", () => {
    // A temp tour under the plugin tree so its `tour-viewer` import resolves.
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-broken-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      writeFileSync(
        tour,
        `import { Tour, Section, Diff } from "tour-viewer";\n` +
          `export default () => (<Tour title="x"><Section id="s" title="S">` +
          `<Diff file="notifier/send.py" hunk={99} /></Section></Tour>);\n`,
      );
      const { code, stderr } = build(tour, resolve(dir, "tour.html"));
      expect(code).toBe(1);
      expect(stderr).toContain("does not exist");
      expect(stderr).toContain("not built");
      expect(existsSync(resolve(dir, "tour.html"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an annotation on a line the shown hunk lacks fails the build", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-annot-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      writeFileSync(
        tour,
        `import { Tour, Section, Diff, Annotation } from "tour-viewer";\n` +
          `export default () => (<Tour title="x"><Section id="s" title="S">` +
          `<Diff file="notifier/config.py" hunk={1}>` +
          `<Annotation line={99} side="new">nope</Annotation>` +
          `</Diff></Section></Tour>);\n`,
      );
      const { code, stderr } = build(tour, resolve(dir, "tour.html"));
      expect(code).toBe(1);
      expect(stderr).toContain("is not a shown line");
      expect(existsSync(resolve(dir, "tour.html"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("uncovered changed lines fail the build and remove a stale output", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-coverage-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      const out = resolve(dir, "tour.html");
      writeFileSync(
        tour,
        `import { Tour, Section, Diff } from "tour-viewer";\n` +
          `export default () => (<Tour title="x"><Section id="s" title="S">` +
          `<Diff file="notifier/config.py" hunk={1} />` +
          `</Section></Tour>);\n`,
      );
      writeFileSync(out, "stale artifact");
      const { code, stderr } = build(tour, out);
      expect(code).toBe(1);
      expect(stderr).toContain("changed line(s) are not shown by any <Diff>");
      expect(stderr).toContain("notifier/send.py");
      expect(stderr).toContain("tests/test_send.py");
      expect(existsSync(out)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("coverage uses the resolved slice rows and reports the omitted side", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-slice-coverage-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      writeFileSync(
        tour,
        `import { Tour, Section, Diff } from "tour-viewer";\n` +
          `export default () => (<Tour title="x"><Section id="s" title="S">` +
          `<Diff file="notifier/send.py" hunk={1} />` +
          `<Diff file="notifier/send.py" lines={{ side: "new", start: 14, end: 22 }} />` +
          `<Diff file="notifier/config.py" hunk={1} />` +
          `<Diff file="tests/test_send.py" hunk={1} collapsed />` +
          `</Section></Tour>);\n`,
      );
      const { code, stderr } = build(tour, resolve(dir, "tour.html"));
      expect(code).toBe(1);
      expect(stderr).toContain("notifier/send.py: old lines 12-13");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects output aliases without deleting either input", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-output-alias-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      const diff = resolve(dir, "pr.diff");
      const alias = resolve(dir, "tour-alias.tsx");
      writeFileSync(tour, `export default () => null;\n`);
      writeFileSync(diff, readFileSync(DIFF));
      linkSync(tour, alias);

      const direct = build(tour, tour, diff);
      expect(direct.code).toBe(2);
      expect(direct.stderr).toContain("output must be different");
      expect(readFileSync(tour, "utf8")).toBe(`export default () => null;\n`);

      const linked = build(tour, alias, diff);
      expect(linked.code).toBe(2);
      expect(linked.stderr).toContain("output must be different");
      expect(readFileSync(tour, "utf8")).toBe(`export default () => null;\n`);

      const diffOutput = build(tour, diff, diff);
      expect(diffOutput.code).toBe(2);
      expect(readFileSync(diff, "utf8")).toBe(readFileSync(DIFF, "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing inputs invalidate a stale output", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-missing-input-"));
    try {
      const out = resolve(dir, "tour.html");
      writeFileSync(out, "stale");
      const missingTour = build(resolve(dir, "missing.tsx"), out);
      expect(missingTour.code).toBe(2);
      expect(missingTour.stderr).toContain("tour not found");
      expect(existsSync(out)).toBe(false);

      const tour = resolve(dir, "tour.tsx");
      writeFileSync(tour, `export default () => null;\n`);
      writeFileSync(out, "stale again");
      const missingDiff = build(tour, out, resolve(dir, "missing.diff"));
      expect(missingDiff.code).toBe(2);
      expect(missingDiff.stderr).toContain("diff not found");
      expect(existsSync(out)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("empty and malformed diff inputs fail before rendering", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-invalid-diff-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      const diff = resolve(dir, "pr.diff");
      const out = resolve(dir, "tour.html");
      writeFileSync(tour, `export default () => null;\n`);

      writeFileSync(diff, "\n");
      const empty = build(tour, out, diff);
      expect(empty.code).toBe(2);
      expect(empty.stderr).toContain("diff is empty");

      writeFileSync(diff, "this is not a git diff\n");
      const malformed = build(tour, out, diff);
      expect(malformed.code).toBe(2);
      expect(malformed.stderr).toContain("not a valid git patch");

      writeFileSync(diff, "diff --git a/foo b/foo\n");
      const truncated = build(tour, out, diff);
      expect(truncated.code).toBe(2);
      expect(truncated.stderr).toContain("not a valid git patch");

      writeFileSync(
        diff,
        `diff --git a/foo b/foo\n--- a/foo\n+++ b/foo\n@@ -1 +1 @@\n`,
      );
      const truncatedHunk = build(tour, out, diff);
      expect(truncatedHunk.code).toBe(2);
      expect(truncatedHunk.stderr).toContain("not a valid git patch");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("accepts a valid mode-only diff with no changed lines", () => {
    const dir = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-mode-only-"));
    try {
      const tour = resolve(dir, "tour.tsx");
      const diff = resolve(dir, "pr.diff");
      const out = resolve(dir, "tour.html");
      writeFileSync(
        tour,
        `import { Tour, Section } from "tour-viewer";\n` +
          `export default () => (<Tour title="x"><Section id="s" title="S">mode only</Section></Tour>);\n`,
      );
      writeFileSync(
        diff,
        `diff --git a/script.sh b/script.sh\nold mode 100644\nnew mode 100755\n`,
      );
      const result = build(tour, out, diff);
      expect(result.code, result.stderr).toBe(0);
      expect(existsSync(out)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  test("the demo fixture builds to a single offline tour.html", () => {
    const out = resolve(OUT, "tour.html");
    const { code, stderr } = build(resolve(FIXTURES, "example.tour.tsx"), out);
    expect(code, stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    const html = readFileSync(out, "utf8");
    // Self-contained: no external script/style/link references.
    expect(html).not.toContain("<link ");
    expect(html).not.toContain("src=\"http");
    // Some static hosts reject literal U+FFFD; the build re-escapes it, so none must survive
    // into the published HTML (bundled highlighter grammars contain it as a range).
    expect(html).not.toContain("�");
    // The victory easter egg's image + sound must be inlined as data: URIs, not emitted as
    // separate files — otherwise the "single offline file" guarantee silently breaks.
    expect(html).toContain("data:image/jpeg;base64");
    expect(html).toContain("data:audio/mpeg;base64");
    // Deliberately no assertions on the fixture's CONTENT (section ids, diff/heading counts):
    // the fixture is a living reference example and content assertions only produce churn.
  }, 120_000);
});
