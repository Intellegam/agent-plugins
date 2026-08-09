# Claude Code adapter

Use these mechanics only after reading the shared `code-tour` skill.

## Locate and build

1. Resolve `<skill-base>` as `${CLAUDE_PLUGIN_ROOT}/skills/code-tour`.
2. Run `<skill-base>/scripts/setup.sh` for the scaffold step.
3. Keep the generated workspace outside the reviewed repository unless the user requests otherwise.

## Visual QA

Use an explicitly available browser or computer-use surface to inspect the built file. If local-file navigation is unavailable, run `bun run preview` in the workspace, open the printed loopback URL, and stop the server afterward. The preview command serves only `tour.html` byte-for-byte; do not substitute a transforming development server. Check wide and narrow layouts, Mermaid rendering, annotation placement, diff expand/collapse interaction, and the absence of `[data-tour-runtime-error]`.

If no browser or vision surface is available, do not treat launching an OS opener as inspection. State that visual QA was not performed and ask the user to open the local file.

## Deliver

Return the built `tour.html` path. A request to create a code tour does not by itself authorize deployment.

If the user explicitly asks to publish, share, or host the tour, publish the built `tour.html` unchanged with Claude's Artifact tool. Use a one-sentence description naming the PR and keep the favicon stable across rebuilds. Return both the Artifact link and local path.

Do not invoke `artifact-design`: `tour-viewer` already owns the page design. Do not post the link to the PR without separate explicit authorization.
