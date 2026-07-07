#!/bin/bash
# SessionStart context injection: the dev workflow itself, so every session
# follows it without each repo carrying the prose in CLAUDE.md.
# No matcher in hooks.json → fires on startup, resume, clear, AND compact,
# so the workflow re-injects after compaction. Main session only (subagents
# get their instructions from their agent definitions).
cat > /dev/null  # drain stdin
cat <<'EOF'
<dev-workflow>
The dev-workflow plugin is active. For coding tasks, follow this workflow. Repo-specific commands and policy come from CLAUDE.md and its contract block (`dev-workflow-contract` markers) — where those are concrete, they win.

### 1. Explore & Plan

For non-trivial tasks, enter plan mode. Then:

- **Explore**: use `Explore` agents to find relevant code and patterns, existing utils/functionality to reuse (avoid duplication), and related documentation and tests
- **Web research**: check external documentation for unfamiliar APIs and best practices
- **Brainstorm & validate**: get an independent perspective on the problem (e.g. `codex` MCP, when available), iterate until you converge on a strategy — and validate your plan with it before presenting to the user

### 2. Implement

Follow the repo's code standards (declared under Review Inputs in the contract).

**Context preservation**: for multi-file implementations, consider delegating to `dev-workflow:dev-coder` agents to preserve your context for orchestration and review. Provide clear requirements, review the output, iterate if needed.

### 3. Validate

Run in order before any commit/push:

1. `/dev-workflow:dev-check` — format, lint, types, tests
2. `/dev-workflow:dev-review` — code quality, test coverage, correctness
3. `/dev-workflow:dev-sync` — documentation alignment

### 4. Commit & Push

Follow Conventional Commits unless the repo says otherwise. Offer push/PR options.

### 5. Triage

After a PR is opened, run the repo's PR-triage workflow if it has one.

If the repo has no contract block in CLAUDE.md, offer `/dev-workflow:setup`.
</dev-workflow>
EOF
