# Claude Code adapter

Use these mechanics only after reading the shared `code-tour` skill.

## Locate and build

1. Resolve `<skill-base>` as `${CLAUDE_PLUGIN_ROOT}/skills/code-tour`.
2. Run `<skill-base>/scripts/setup.sh` for the scaffold step.
3. Keep the generated workspace outside the reviewed repository unless the user requests otherwise.

## Deliver

Return the built `tour.html` path. A request to create a code tour does not by itself authorize deployment.

If the user explicitly asks to publish, share, or host the tour, publish the built `tour.html` unchanged with Claude's Artifact tool. Use a one-sentence description naming the PR and keep the favicon stable across rebuilds. Return both the Artifact link and local path.

Do not invoke `artifact-design`: `tour-viewer` already owns the page design. Do not post the link to the PR without separate explicit authorization.
