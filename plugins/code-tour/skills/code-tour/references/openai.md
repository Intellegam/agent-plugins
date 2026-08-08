# OpenAI adapter

Use these mechanics only after reading the shared `code-tour` skill. This adapter covers OpenAI Codex and ChatGPT Work sessions that expose a local project runtime.

## Preflight and locate

1. Resolve `<skill-base>` from the installed skill directory and run `<skill-base>/scripts/setup.sh` for the scaffold step.
2. Confirm `bun` is available, the target directory is writable, and the initial dependency install can run. The setup script performs the Bun check; report missing runtime or dependency access directly.
3. A checked-out repository is optional when the user supplies `pr.diff`. Without the build runtime, do not call a prose-only explanation a code tour because it lacks build-time reference validation.

## Deliver

- Codex CLI or IDE: return a clickable local `tour.html` path. Do not claim it renders inline; the user opens it in a browser.
- ChatGPT Work or Codex in the desktop app: return the built file through the host's file-delivery surface when available, plus its local path.
- Ordinary ChatGPT without the required local runtime: offer a clearly labeled prose PR walkthrough or direct the user to run the full skill in Claude Code, Codex, or ChatGPT Work. Do not silently drop the grounding guarantee.

A request to create a code tour does not by itself authorize deployment. Do not use ChatGPT Visualizations for the full tour: they do not render in Codex CLI or IDE and do not replace the durable browser review surface.

If the user explicitly asks for a hosted URL and ChatGPT Sites is available, use the Sites workflow to publish the existing built file without redesigning it. Treat this as a production deployment, preserve the requested visibility, and return both the URL and local file. Otherwise, deliver the standalone HTML without claiming it was published.

Do not post a hosted link to the PR without separate explicit authorization.
