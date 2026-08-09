/** The visual-QA preview serves the built artifact unchanged and exposes nothing else. */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { startPreview } from "../scripts/preview.ts";

const PLUGIN_ROOT = resolve(import.meta.dir, "../../..");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("preview", () => {
  test("serves tour.html byte-for-byte on loopback and rejects other paths", async () => {
    const root = mkdtempSync(resolve(PLUGIN_ROOT, ".preview-test-"));
    roots.push(root);
    const file = resolve(root, "tour.html");
    const html = `<!doctype html><title>x</title><script>${String.fromCodePoint(0xffff)}</script>`;
    writeFileSync(file, html);
    const server = startPreview(file);
    try {
      expect(server.hostname).toBe("127.0.0.1");
      const response = await fetch(`http://127.0.0.1:${server.port}/tour.html`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toBe(html);
      expect((await fetch(`http://127.0.0.1:${server.port}/package.json`)).status).toBe(404);
    } finally {
      server.stop(true);
    }
  });
});
