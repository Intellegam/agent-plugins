# Claude Code adapter

Use these mechanics only after reading the shared `code-tour` skill.

## Authoring worker

When acting as orchestrator, launch one fresh `general-purpose` agent and begin its prompt with `CODE_TOUR_WORKER=1`. Pass only the shared contract's narrow handoff, tell it to read the shared skill at the resolved absolute skill-base, and instruct it to write only the external tour workspace. Require it to perform steps 2–4 and return the shared worker output contract. Do not pass the parent transcript or an authored summary of the change, and do not treat the agent as a permission boundary.

Keep delivery, publishing, PR comments, and any active PR waiter in the parent agent. If a fresh writable agent is unavailable, follow the shared inline fallback.

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
