/** End-to-end build: a broken reference fails, and the demo fixture bundles to tour.html. */

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BUILD = resolve(import.meta.dir, "../scripts/build.ts");
const FIXTURES = resolve(import.meta.dir, "../../../tests/fixtures");
const PLUGIN_ROOT = resolve(import.meta.dir, "../../..");
const DIFF = resolve(FIXTURES, "example.diff");

const OUT = mkdtempSync(resolve(PLUGIN_ROOT, ".e2e-out-"));
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

function build(tour: string, out: string) {
  const r = Bun.spawnSync(["bun", BUILD, "--tour", tour, "--diff", DIFF, "--out", out], {
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

  test("the demo fixture builds to a single offline tour.html", () => {
    const out = resolve(OUT, "tour.html");
    const { code, stderr } = build(resolve(FIXTURES, "example.tour.tsx"), out);
    expect(code, stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    const html = readFileSync(out, "utf8");
    // Self-contained: no external script/style/link references.
    expect(html).not.toContain("<link ");
    expect(html).not.toContain("src=\"http");
    // The Claude-Artifact deploy rejects any literal U+FFFD; the build re-escapes it, so none
    // must survive into the published HTML (bundled highlighter grammars contain it as a range).
    expect(html).not.toContain("�");
    // The victory easter egg's image + sound must be inlined as data: URIs, not emitted as
    // separate files — otherwise the "single offline file" guarantee silently breaks.
    expect(html).toContain("data:image/jpeg;base64");
    expect(html).toContain("data:audio/mpeg;base64");
    // Deliberately no assertions on the fixture's CONTENT (section ids, diff/heading counts):
    // the fixture is a living reference example and content assertions only produce churn.
  }, 120_000);
});
