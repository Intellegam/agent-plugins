# OpenAI adapter

Use these mechanics only after reading the shared `code-tour` skill. This adapter covers OpenAI Codex and ChatGPT Work sessions that expose a local project runtime.

## Authoring worker

In Codex, use `spawn_agent` with `fork_turns="none"` and a task name such as `code_tour_author` for steps 1–4. Tell it that it is the authoring worker, pass the shared skill path and only the target/audience context defined there, and do not include the parent transcript or an authored summary. Keep delivery and external actions in the parent; if no writable sub-agent is available, continue inline.

## Preflight and locate

1. Resolve `<skill-base>` as the absolute parent directory of the exact `SKILL.md` path announced for the active skill in this session. Expand a catalog root alias first when the announcement uses one. Do not infer it from the repository working directory, `$CODEX_HOME`, or a cache search because multiple plugin versions may coexist. Verify `<skill-base>/scripts/setup.sh` exists; if it does not, stop and report the announced path.
2. Confirm `bun` and `git` are available, the target directory is writable, and the initial dependency install can run. The setup script performs the Bun check; report missing runtime or dependency access directly.
3. A checked-out repository is optional when the user supplies `pr.diff`. Without the build runtime, do not call a prose-only explanation a code tour because it lacks build-time reference validation.

## Visual QA

Use a browser or computer-use capability only when it is explicitly exposed in the current session. Open the built file directly when that surface permits local files. If it rejects `file://`, run `bun run preview` in the workspace, open the printed loopback URL, inspect the page, and stop the server afterward. The preview command serves only `tour.html` byte-for-byte; do not substitute a transforming development server.

Check a wide and narrow layout, Mermaid diagrams rather than source fallbacks, annotation placement, diff expand/collapse interaction, and the absence of `[data-tour-runtime-error]`. If no browser or vision capability is exposed, do not probe speculative tools or claim the page was inspected. Deliver it with: “Visual QA was not performed because this session has no browser surface; please open the local file to inspect it.”

## Deliver

- Use attachment delivery only when the current session exposes a documented local-file upload or attachment capability that accepts an existing filesystem path. When it does, attach `tour.html` and also return its absolute local path.
- Otherwise, return an absolute clickable Markdown link to `tour.html` plus the plain absolute path. Do not infer attachment support from running in a desktop app or ChatGPT Work, and do not probe speculative tools. Do not claim the page renders inline; the user opens it in a browser.
- Ordinary ChatGPT without the required local runtime: offer a clearly labeled prose PR walkthrough or direct the user to run the full skill in Claude Code, Codex, or ChatGPT Work. Do not silently drop the grounding guarantee.

A request to create a code tour does not by itself authorize deployment. Do not use ChatGPT Visualizations for the full tour: they do not render in Codex CLI or IDE and do not replace the durable browser review surface.

If the user explicitly asks for a hosted URL and ChatGPT Sites is available, use the Sites workflow to publish the existing built file without redesigning it. Treat this as a production deployment, preserve the requested visibility, and return both the URL and local file. Otherwise, deliver the standalone HTML without claiming it was published.

Do not post a hosted link to the PR without separate explicit authorization.
