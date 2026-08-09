/** Setup recovery: Bun receives a writable local tempdir and failures preserve a resumable scaffold. */

import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, resolve } from "node:path";

const SETUP = resolve(import.meta.dir, "../scripts/setup.ts");
const FIXTURES = resolve(import.meta.dir, "../../../tests/fixtures");
const PLUGIN_ROOT = resolve(import.meta.dir, "../../..");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function runSetup(fakeExit: number) {
  const root = mkdtempSync(resolve(PLUGIN_ROOT, ".setup-test-"));
  roots.push(root);
  const target = resolve(root, "workspace");
  const bin = resolve(root, "bin");
  const envOut = resolve(root, "install-env.txt");
  mkdirSync(bin);
  const fakeBun = resolve(bin, "bun");
  writeFileSync(
    fakeBun,
    `#!/bin/sh\nprintf '%s\\n%s\\n%s\\n' "$TMPDIR" "$TMP" "$TEMP" > "$CODE_TOUR_ENV_OUT"\nexit "$CODE_TOUR_FAKE_EXIT"\n`,
  );
  chmodSync(fakeBun, 0o755);

  const result = Bun.spawnSync(
    [process.execPath, SETUP, target, "--diff", resolve(FIXTURES, "example.diff")],
    {
      cwd: PLUGIN_ROOT,
      env: {
        ...process.env,
        PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
        CODE_TOUR_ENV_OUT: envOut,
        CODE_TOUR_FAKE_EXIT: String(fakeExit),
      },
    },
  );
  return { result, root, target, envOut, installTemp: resolve(target, ".tour-tmp") };
}

describe("setup dependency install", () => {
  test("uses one writable workspace-local temp directory", () => {
    const { result, target, envOut, installTemp } = runSetup(0);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(readFileSync(envOut, "utf8").trim().split("\n")).toEqual([
      installTemp,
      installTemp,
      installTemp,
    ]);
    const workspacePackage = JSON.parse(readFileSync(resolve(target, "package.json"), "utf8"));
    expect(workspacePackage.scripts.preview).toBe(
      "bun run node_modules/tour-viewer/scripts/preview.ts",
    );
    expect(existsSync(installTemp)).toBe(false);
  });

  test("preserves the scaffold and prints an exact retry after install failure", () => {
    const { result, target, installTemp } = runSetup(17);
    const stderr = result.stderr.toString();
    expect(result.exitCode).toBe(1);
    expect(existsSync(resolve(target, "tour.tsx"))).toBe(true);
    expect(existsSync(resolve(target, "pr.diff"))).toBe(true);
    expect(existsSync(resolve(target, "package.json"))).toBe(true);
    expect(existsSync(installTemp)).toBe(true);
    expect(stderr).toContain("the scaffold was preserved and is safe to resume");
    expect(stderr).toContain(
      `cd '${target}' && TMPDIR='${installTemp}' TMP='${installTemp}' TEMP='${installTemp}' bun install`,
    );
    expect(stderr).not.toContain("at main");
  });
});
