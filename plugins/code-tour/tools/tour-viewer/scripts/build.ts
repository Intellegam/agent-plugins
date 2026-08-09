#!/usr/bin/env bun
/**
 * code-tour build. Operates on a workspace containing `tour.tsx` + `pr.diff`.
 *
 *   bun run build.ts [workspaceDir] [--tour PATH] [--diff PATH] [--out PATH]
 *
 * Renders the tour once with `react-dom/server`. This validates that every `<Diff>` resolves
 * and that their union shows every inserted/deleted line in `pr.diff`; the same markup is
 * embedded so the page reads offline before JS runs. Validation failures exit 1 before Vite +
 * vite-plugin-singlefile bundle the self-contained `tour.html`.
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { TourProvider, consumeValidation, resetFailures } from "tour-viewer";
import {
  changedLineKey,
  changedLinesInFiles,
  parse,
  type ChangedLine,
} from "../src/diff.ts";

interface Args {
  tour: string;
  diff: string;
  out: string;
}

function parseArgs(argv: string[]): Args {
  let workspace: string | null = null;
  let tour: string | null = null;
  let diff: string | null = null;
  let out: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tour") tour = argv[++i];
    else if (arg === "--diff") diff = argv[++i];
    else if (arg === "--out") out = argv[++i];
    else if (!arg.startsWith("--")) workspace = arg;
  }

  const dir = workspace ? resolve(workspace) : process.cwd();
  const abs = (p: string | null, fallback: string) => (p ? resolve(p) : resolve(dir, fallback));
  return { tour: abs(tour, "tour.tsx"), diff: abs(diff, "pr.diff"), out: abs(out, "tour.html") };
}

/** Render the tour once: collect broken-reference failures and return the SSR markup. */
async function render(
  tourPath: string,
  diffText: string,
): Promise<{ failures: string[]; covered: Set<string>; html: string }> {
  const mod = await import(pathToFileURL(tourPath).href);
  const TourPage = mod.default;
  if (typeof TourPage !== "function") {
    throw new Error(`${tourPath} must default-export a React component (the tour page)`);
  }
  resetFailures();
  const html = renderToString(
    createElement(TourProvider, { diff: diffText }, createElement(TourPage)),
  );
  return { ...consumeValidation(), html };
}

function formatMissingCoverage(lines: ChangedLine[]): string[] {
  const groups = new Map<string, { file: string; side: ChangedLine["side"]; lines: number[] }>();
  for (const line of lines) {
    const key = `${line.file}\0${line.side}`;
    const group = groups.get(key) ?? { file: line.file, side: line.side, lines: [] };
    group.lines.push(line.line);
    groups.set(key, group);
  }

  return [...groups.values()].map(({ file, side, lines: raw }) => {
    const lines = [...new Set(raw)].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = lines[0];
    let end = start;
    for (const line of lines.slice(1)) {
      if (line === end + 1) end = line;
      else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = line;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `${file}: ${side} line${lines.length === 1 ? "" : "s"} ${ranges.join(", ")}`;
  });
}

function sameFile(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const left = statSync(a);
    const right = statSync(b);
    return left.dev === right.dev && left.ino === right.ino;
  } catch {
    return false;
  }
}

function gitPatchError(diffText: string): string | null {
  try {
    execFileSync("git", ["apply", "--numstat"], {
      input: diffText,
      encoding: "utf8",
      stdio: ["pipe", "ignore", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    });
    return null;
  } catch (error) {
    const detail =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr).trim()
        : error instanceof Error
          ? error.message
          : String(error);
    return detail || "git could not parse the patch";
  }
}

/** Bundle the (pre-rendered) tour into a single self-contained tour.html. */
async function bundle(tourPath: string, diffPath: string, prerendered: string, outPath: string): Promise<void> {
  const { build } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const { viteSingleFile } = await import("vite-plugin-singlefile");

  // The entry dir lives next to the tour so bare imports (react, tour-viewer, …) resolve
  // through the same node_modules the tour uses. The server-rendered markup is embedded so
  // the file shows content offline; the browser hydrates it for nav + mermaid.
  const entryDir = mkdtempSync(join(dirname(tourPath), ".tour-build-"));
  const distDir = join(entryDir, "dist");
  try {
    const toEntry = (p: string) => {
      const rel = relative(entryDir, p).split("\\").join("/");
      return rel.startsWith(".") ? rel : `./${rel}`;
    };
    writeFileSync(
      join(entryDir, "main.tsx"),
      [
        `import "tour-viewer/styles.css";`,
        `import { Component } from "react";`,
        `import { hydrateRoot } from "react-dom/client";`,
        `import { TourProvider } from "tour-viewer";`,
        `import TourPage from "${toEntry(tourPath)}";`,
        `import prDiff from "${toEntry(diffPath)}?raw";`,
        ``,
        `const isResizeObserverNoise = (error) => String(error?.message || error).includes("ResizeObserver loop");`,
        `const showRuntimeError = (error) => {`,
        `  if (isResizeObserverNoise(error)) return;`,
        `  const message = error instanceof Error ? error.stack || error.message : String(error);`,
        `  const panel = document.createElement("pre");`,
        `  panel.setAttribute("data-tour-runtime-error", "");`,
        `  panel.style.cssText = "position:fixed;inset:16px;z-index:99999;overflow:auto;padding:16px;color:#82071e;background:#ffebe9;border:1px solid #cf222e;border-radius:8px;white-space:pre-wrap";`,
        `  panel.textContent = "Code tour runtime error:\\n\\n" + message;`,
        `  document.querySelector("[data-tour-runtime-error]")?.remove();`,
        `  document.body.append(panel);`,
        `};`,
        `window.addEventListener("error", (event) => {`,
        `  const error = event.error || event.message;`,
        `  if (isResizeObserverNoise(error)) { event.preventDefault(); return; }`,
        `  showRuntimeError(error);`,
        `});`,
        `window.addEventListener("unhandledrejection", (event) => showRuntimeError(event.reason));`,
        `class TourErrorBoundary extends Component {`,
        `  constructor(props) { super(props); this.state = { error: null }; }`,
        `  static getDerivedStateFromError(error) { return { error }; }`,
        `  componentDidCatch(error) { showRuntimeError(error); }`,
        `  render() { return this.state.error ? null : this.props.children; }`,
        `}`,
        `const root = document.getElementById("root");`,
        `if (root) hydrateRoot(root, <TourErrorBoundary><TourProvider diff={prDiff}><TourPage /></TourProvider></TourErrorBoundary>);`,
        ``,
      ].join("\n"),
    );
    writeFileSync(
      join(entryDir, "index.html"),
      [
        `<!doctype html>`,
        `<html lang="en">`,
        `  <head>`,
        `    <meta charset="utf-8" />`,
        `    <meta name="viewport" content="width=device-width, initial-scale=1" />`,
        `    <title>${titleFrom(prerendered)}</title>`,
        `  </head>`,
        `  <body>`,
        `    <div id="root">${prerendered}</div>`,
        `    <script type="module" src="./main.tsx"></script>`,
        `  </body>`,
        `</html>`,
        ``,
      ].join("\n"),
    );

    await build({
      root: entryDir,
      logLevel: "warn",
      // A workspace links tour-viewer via file:, so components resolve react from the repo
      // while the entry resolves it locally — dedupe collapses those to one copy.
      resolve: { dedupe: ["react", "react-dom"] },
      plugins: [react(), viteSingleFile()],
      build: { outDir: distDir, emptyOutDir: true, reportCompressedSize: false, chunkSizeWarningLimit: 100000 },
    });

    const built = join(distDir, "index.html");
    if (!existsSync(built)) throw new Error("vite build did not produce dist/index.html");
    // Bundled highlighter grammars contain literal U+FFFD as a Unicode range endpoint
    // (XML NameChar ends at �). Some static hosts reject the literal character; re-escaping
    // is semantically identical inside JS string/regex literals.
    const html = readFileSync(built, "utf8").replaceAll("�", "\\uFFFD");
    writeFileSync(outPath, html);
  } finally {
    rmSync(entryDir, { recursive: true, force: true });
  }
}

/** The tour's own <h1 class="tour-title"> text (inline tags stripped) for the document <title>. */
function titleFrom(prerendered: string): string {
  const match = prerendered.match(/<h1[^>]*class="tour-title"[^>]*>([\s\S]*?)<\/h1>/);
  const text = match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
  return text || "code tour";
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (sameFile(args.out, args.tour) || sameFile(args.out, args.diff)) {
    return err("output must be different from tour.tsx and pr.diff");
  }

  // A failed rebuild must not leave an older artifact that still looks deliverable.
  rmSync(args.out, { force: true });

  if (!existsSync(args.tour)) return err(`tour not found: ${args.tour}`);
  if (!existsSync(args.diff)) return err(`diff not found: ${args.diff}`);

  const diffText = readFileSync(args.diff, "utf8");
  if (diffText.trim().length === 0) return err(`diff is empty: ${args.diff}`);
  const patchError = gitPatchError(diffText);
  if (patchError) return err(`diff is not a valid git patch: ${patchError}`);
  let files;
  try {
    files = parse(diffText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(`diff could not be parsed: ${message}`);
  }
  if (files.length === 0) return err(`diff does not contain a parseable git patch: ${args.diff}`);

  const { failures, covered, html } = await render(args.tour, diffText);

  if (failures.length > 0) {
    console.error(`build FAILED: ${failures.length} broken reference(s). tour.html not built.\n`);
    for (const f of failures) console.error(`  - ${f}`);
    return 1;
  }

  const missing = changedLinesInFiles(files).filter(
    (line) => !covered.has(changedLineKey(line)),
  );
  if (missing.length > 0) {
    console.error(
      `build FAILED: ${missing.length} changed line(s) are not shown by any <Diff>. tour.html not built.\n`,
    );
    for (const group of formatMissingCoverage(missing)) console.error(`  - ${group}`);
    return 1;
  }

  await bundle(args.tour, args.diff, html, args.out);
  const resolved = (html.match(/data-tour-diff=/g) ?? []).length;
  console.error(
    `${resolved} diff reference(s) resolved, 0 broken, complete changed-line coverage — wrote ${args.out}`,
  );
  return 0;
}

function err(message: string): number {
  console.error(message);
  return 2;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(2);
  },
);
