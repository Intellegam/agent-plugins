#!/usr/bin/env bun
/** Serve one built tour.html unchanged on loopback for browser-based visual QA. */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

interface Args {
  file: string;
  port: number;
}

function parseArgs(argv: string[]): Args {
  let workspace: string | null = null;
  let file: string | null = null;
  let port = 0;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") file = argv[++i];
    else if (arg === "--port") port = Number(argv[++i]);
    else if (!arg.startsWith("--")) workspace = arg;
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535");
  }
  const dir = workspace ? resolve(workspace) : process.cwd();
  return { file: file ? resolve(file) : resolve(dir, "tour.html"), port };
}

export function startPreview(file: string, port = 0) {
  const absolute = resolve(file);
  if (!existsSync(absolute)) throw new Error(`tour not found: ${absolute}`);
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path !== "/" && path !== "/tour.html") return new Response("not found", { status: 404 });
      return new Response(Bun.file(absolute), {
        headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const server = startPreview(args.file, args.port);
    console.error(`preview ready: http://127.0.0.1:${server.port}/tour.html`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
