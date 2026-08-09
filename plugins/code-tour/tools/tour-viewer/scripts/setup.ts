#!/usr/bin/env bun
/**
 * Scaffold a code-tour workspace.
 *
 *   bun run setup.ts <targetDir> [--diff PATH] [--base REF --head REF [--repo DIR]] [--no-install]
 *
 * Produces a self-contained directory the tour-authoring agent edits and builds:
 *
 *   <targetDir>/
 *     tour.tsx        copied from the template — the only file the agent edits
 *     pr.diff         the raw diff the tour references (see --diff / --base/--head)
 *     package.json    links tour-viewer via file: and pins the render/build deps
 *     tsconfig.json
 *     .gitignore
 *
 * Then: `cd <targetDir> && bun install && bun run build` → `tour.html`.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const viewerRoot = resolve(scriptDir, "..");

interface Args {
  target: string;
  diff: string | null;
  base: string | null;
  head: string | null;
  repo: string;
  install: boolean;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function parseArgs(argv: string[]): Args {
  let target: string | null = null;
  let diff: string | null = null;
  let base: string | null = null;
  let head: string | null = null;
  let repo = process.cwd();
  let install = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--diff") diff = argv[++i];
    else if (arg === "--base") base = argv[++i];
    else if (arg === "--head") head = argv[++i];
    else if (arg === "--repo") repo = argv[++i];
    else if (arg === "--no-install") install = false;
    else if (!arg.startsWith("--")) target = arg;
  }

  if (!target) {
    console.error("usage: bun run setup.ts <targetDir> [--diff PATH | --base REF --head REF] [--no-install]");
    process.exit(2);
  }
  return { target: resolve(target), diff, base, head, repo: resolve(repo), install };
}

function resolveDiff(args: Args, target: string): void {
  const dest = resolve(target, "pr.diff");
  if (args.diff) {
    cpSync(resolve(args.diff), dest);
    console.error(`pr.diff  ← copied from ${args.diff}`);
    return;
  }
  if (args.base && args.head) {
    const out = execFileSync("git", ["-C", args.repo, "diff", `${args.base}...${args.head}`], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    writeFileSync(dest, out);
    console.error(`pr.diff  ← git diff ${args.base}...${args.head} (in ${args.repo})`);
    return;
  }
  if (!existsSync(dest)) {
    writeFileSync(dest, "");
    console.error("pr.diff  ← empty placeholder — replace it with your PR's raw diff before building");
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.target, { recursive: true });

  // tour.tsx (never overwrite an existing edited tour)
  const tourDest = resolve(args.target, "tour.tsx");
  if (existsSync(tourDest)) {
    console.error("tour.tsx ← kept (already exists)");
  } else {
    cpSync(resolve(viewerRoot, "template", "tour.tsx"), tourDest);
    console.error("tour.tsx ← copied from template");
  }

  resolveDiff(args, args.target);

  // package.json — link tour-viewer via file:, mirror its render/build dependency versions.
  const viewerPkg = JSON.parse(readFileSync(resolve(viewerRoot, "package.json"), "utf8"));
  const workspacePkg = {
    name: "code-tour-workspace",
    private: true,
    type: "module",
    scripts: {
      build: "bun run node_modules/tour-viewer/scripts/build.ts",
      map: "bun run node_modules/tour-viewer/scripts/map.ts",
      preview: "bun run node_modules/tour-viewer/scripts/preview.ts",
    },
    dependencies: {
      ...viewerPkg.dependencies,
      "tour-viewer": `file:${viewerRoot}`,
    },
    devDependencies: { ...viewerPkg.devDependencies },
  };
  writeFileSync(resolve(args.target, "package.json"), JSON.stringify(workspacePkg, null, 2) + "\n");

  writeFileSync(
    resolve(args.target, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
          types: ["react", "react-dom"],
          allowImportingTsExtensions: true,
          noEmit: true,
        },
        include: ["tour.tsx"],
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(
    resolve(args.target, ".gitignore"),
    ["node_modules/", "tour.html", ".tour-build-*/", ".tour-tmp/", ""].join("\n"),
  );

  console.error("package.json, tsconfig.json, .gitignore ← written");

  if (args.install) {
    console.error("\nrunning bun install …");
    const installTemp = resolve(args.target, ".tour-tmp");
    mkdirSync(installTemp, { recursive: true });
    try {
      execFileSync("bun", ["install"], {
        cwd: args.target,
        stdio: "inherit",
        env: {
          ...process.env,
          TMPDIR: installTemp,
          TMP: installTemp,
          TEMP: installTemp,
        },
      });
      rmSync(installTemp, { recursive: true, force: true });
    } catch {
      console.error("\ndependency install failed; the scaffold was preserved and is safe to resume");
      console.error("retry only the install step with:");
      console.error(
        `  cd ${shellQuote(args.target)} && TMPDIR=${shellQuote(installTemp)} TMP=${shellQuote(installTemp)} TEMP=${shellQuote(installTemp)} bun install`,
      );
      process.exitCode = 1;
      return;
    }
  }

  console.error("\nworkspace ready:");
  console.error(`  cd ${args.target}`);
  if (!args.install) console.error("  bun install");
  console.error("  # edit tour.tsx, then:");
  console.error("  bun run build      # single-file tour.html (validates refs + full coverage)");
  console.error("  bun run preview    # loopback URL for browser-based visual QA");
}

main();
