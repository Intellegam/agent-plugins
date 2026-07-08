#!/bin/bash
# SessionStart context injection: the dev workflow itself, so every session
# follows it without each repo carrying the prose in CLAUDE.md.
# No matcher in hooks.json → fires on startup, resume, clear, AND compact,
# so the workflow re-injects after compaction. Main session only (subagents
# get a short pointer via subagent-start.sh).
cat > /dev/null  # drain stdin
cat <<'EOF'
<dev-workflow>
The dev-workflow plugin is active. For coding tasks, follow this workflow. Repo-specific commands and policy come from CLAUDE.md (commands & checks, Dev Workflow Plugin sections) — where those are concrete, they win.

This workflow ensures code quality through multiple perspectives: Codex for early collaboration & validation, automated checks, and parallel reviewers that catch different types of issues. Following this process consistently catches problems before they reach production.

### 1. Explore & Plan

For non-trivial tasks, enter plan mode. Then:

- **Explore**: Use `Explore` agents to find things like
  - Relevant code and patterns
  - Existing utils/functionality to reuse (avoid duplication)
  - Related documentation and tests
- **Web-Research**: Use web-research agents (e.g. `web-explore`) to find external documentation, best practices, or unfamiliar APIs
- **Brainstorm**: Use `codex` MCP to get an independent perspective on the problem, then iterate via `codex-reply` until you converge on a common strategy
- **Plan review**: Before presenting a plan to the user → validate the approach with `codex`. Never present a plan without Codex validation — the user should receive a plan that has been stress-tested by a second perspective.

Read the `collaborating-with-codex` skill for Codex guidelines.

### 2. Implement

Write code following the repo's code standards and testing guidelines (declared under Review Inputs in CLAUDE.md).

**Context preservation**: For larger implementations, consider delegating to `dev-workflow:dev-coder` agents to preserve your context for orchestration and review.

| Scope                          | Consider                                               |
| ------------------------------ | ------------------------------------------------------ |
| Small (few lines, single file) | Implement directly                                     |
| Medium/Large (multi-file)      | Consider delegating to `dev-workflow:dev-coder` agents |

When delegating: provide clear requirements, review the output, iterate if needed.

### 3. Validate

Run these skills in order:

1. `/dev-workflow:dev-check` - Format, lint, types, tests
2. `/dev-workflow:dev-review` - Code quality, test coverage, correctness
3. `/dev-workflow:dev-sync` - Documentation alignment

### 4. Commit & Push

Follow Conventional Commits. Offer push/PR options.

### 5. Triage (after PR is opened)

Run the repo's PR-triage workflow (e.g. `/pr-triage`) to triage review comments and CI failures until the PR is clean.

If the repo has no contract block in CLAUDE.md, offer `/dev-workflow:setup`.
</dev-workflow>
EOF
